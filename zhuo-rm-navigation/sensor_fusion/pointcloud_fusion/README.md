# 点云融合模块

## 功能说明
融合来自多个传感器（Mid70、L2、P100R）的点云数据，生成统一的环境点云表示。

## 融合策略

### 1. 时间同步
使用 `message_filters` 实现多传感器数据时间同步：
```cpp
message_filters::Subscriber<PointCloud2> mid70_sub;
message_filters::Subscriber<PointCloud2> l2_sub;
message_filters::Subscriber<PointCloud2> p100r_sub;

typedef message_filters::sync_policies::ApproximateTime<
    PointCloud2, PointCloud2, PointCloud2> SyncPolicy;
    
message_filters::Synchronizer<SyncPolicy> sync(
    SyncPolicy(10), mid70_sub, l2_sub, p100r_sub);
```

### 2. 坐标系变换
所有点云统一变换到 `base_link` 坐标系：
```cpp
tf2_ros::Buffer tf_buffer;
geometry_msgs::msg::TransformStamped transform;

// 变换点云到 base_link
pcl_ros::transformPointCloud("base_link", *cloud_in, *cloud_out, tf_buffer);
```

### 3. 点云融合
使用 PCL 库进行点云拼接和滤波：
```cpp
// 拼接点云
*fused_cloud = *mid70_cloud + *l2_cloud + *p100r_cloud;

// 体素滤波降采样
pcl::VoxelGrid<PointT> voxel_filter;
voxel_filter.setLeafSize(0.05f, 0.05f, 0.05f);  // 5cm 体素
voxel_filter.filter(*fused_cloud);

// 统计滤波去除离群点
pcl::StatisticalOutlierRemoval<PointT> sor;
sor.setMeanK(50);
sor.setStddevMulThresh(1.0);
sor.filter(*fused_cloud);
```

## 配置文件

### pointcloud_fusion.yaml
```yaml
pointcloud_fusion:
  ros__parameters:
    # 输入话题
    mid70_topic: "/livox/lidar"
    l2_topic: "/unitree_lidar/cloud"
    p100r_topic: "/p100r/depth/colored_points"
    
    # 输出话题
    fused_topic: "/fused_pointcloud"
    
    # 同步参数
    queue_size: 10
    sync_slop: 0.1  # 允许的时间差 (秒)
    
    # 坐标系
    output_frame: "base_link"
    
    # 滤波器参数
    enable_voxel_filter: true
    voxel_size: 0.05  # 5cm
    
    enable_statistical_filter: true
    mean_k: 50
    stddev_mul: 1.0
    
    enable_radius_filter: true
    radius: 0.1  # 10cm
    min_neighbors: 5
    
    # 裁剪参数
    enable_crop: true
    crop_min_x: -10.0
    crop_max_x: 10.0
    crop_min_y: -10.0
    crop_max_y: 10.0
    crop_min_z: -1.0
    crop_max_z: 3.0
    
    # 性能优化
    use_multithreading: true
    num_threads: 4
```

## 融合流程

```
┌──────────┐
│  Mid70   │ FOV 70°, 前向高精度
└────┬─────┘
     │
     ├───────┐
     │       │
┌────▼─────┐ │
│ L2 雷达  │ │ 360°, 全向感知
└────┬─────┘ │
     │       │
     ├───────┤
     │       │
┌────▼─────┐ │
│  P100R   │ │ RGB-D, 近距离补充
└────┬─────┘ │
     │       │
     ▼       ▼
┌─────────────┐
│  时间同步   │ message_filters
└──────┬──────┘
       ▼
┌─────────────┐
│  TF 变换    │ → base_link 统一坐标
└──────┬──────┘
       ▼
┌─────────────┐
│  点云拼接   │ PCL concatenate
└──────┬──────┘
       ▼
┌─────────────┐
│  体素滤波   │ 降采样 5cm
└──────┬──────┘
       ▼
┌─────────────┐
│  统计滤波   │ 去除离群点
└──────┬──────┘
       ▼
┌─────────────┐
│ 融合点云输出│ /fused_pointcloud
└─────────────┘
```

## 使用示例

### 启动融合节点
```bash
ros2 launch zhuo_rm_navigation pointcloud_fusion.launch.py
```

### 可视化融合结果
```bash
ros2 run rviz2 rviz2
# 添加 PointCloud2 显示
# 话题: /fused_pointcloud
# Fixed Frame: base_link
```

### 查看点云信息
```bash
ros2 topic hz /fused_pointcloud
ros2 topic echo --once /fused_pointcloud | grep -A 5 "width\|height"
```

## 性能优化

### 1. 降采样优化
```yaml
# 不同传感器不同降采样率
mid70_downsample: 1  # 高精度，保留
l2_downsample: 2     # 适度降采样
p100r_downsample: 4  # 密集点云，大幅降采样
```

### 2. 并行处理
```cpp
// 多线程并行处理
#pragma omp parallel sections
{
    #pragma omp section
    { process_mid70(mid70_cloud); }
    
    #pragma omp section
    { process_l2(l2_cloud); }
    
    #pragma omp section
    { process_p100r(p100r_cloud); }
}
```

### 3. GPU 加速
使用 PCL GPU 模块加速滤波：
```cpp
pcl::gpu::VoxelGrid<PointT> gpu_voxel;
gpu_voxel.setLeafSize(0.05f, 0.05f, 0.05f);
```

## 依赖项

```bash
sudo apt install ros-humble-pcl-conversions
sudo apt install ros-humble-pcl-ros
sudo apt install ros-humble-tf2-sensor-msgs
sudo apt install libpcl-dev
```

## 质量评估

### 点云密度
```bash
ros2 run pcl_ros pcd_to_pointcloud input.pcd 0.1 _frame_id:=base_link
```

### 融合精度
使用 CloudCompare 进行融合质量评估：
1. 导出融合点云
2. 与单传感器点云对比
3. 计算重叠度和配准误差

## 故障排查

### 点云不同步
1. 检查传感器时间戳
2. 调整 `sync_slop` 参数
3. 验证 TF 树完整性

### 融合点云稀疏
1. 降低 `voxel_size`
2. 减少降采样倍数
3. 检查传感器数据流

### 性能问题
1. 增加 `voxel_size`
2. 启用多线程
3. 减少裁剪区域
