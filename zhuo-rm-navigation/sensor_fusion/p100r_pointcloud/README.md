# P100R 深度相机点云转换模块

## 功能说明
将 P100R 深度相机的 RGB-D 数据转换为 PointCloud2 格式，用于与 LiDAR 点云融合。

## 技术参数
- **深度范围**: 0.3m - 10m
- **分辨率**: 640×480 @ 30fps (深度), 1920×1080 @ 30fps (RGB)
- **FOV**: 58° (H) × 45° (V)
- **深度精度**: ±1% @ 2m
- **接口**: USB 3.0

## 配置文件

### p100r_config.yaml
```yaml
p100r_driver:
  ros__parameters:
    # 相机配置
    device_id: 0
    depth_width: 640
    depth_height: 480
    color_width: 1920
    color_height: 1080
    fps: 30
    
    # TF 坐标系
    camera_frame_id: "p100r_link"
    depth_optical_frame_id: "p100r_depth_optical_frame"
    color_optical_frame_id: "p100r_color_optical_frame"
    
    # 深度处理
    depth_scale: 0.001  # mm to m
    enable_aligned_depth: true
    
    # 点云生成
    enable_pointcloud: true
    pointcloud_topic: "/p100r/depth/points"
    
    # 滤波器
    spatial_filter: true
    temporal_filter: true
    decimation_filter: 2  # 降采样因子
```

### 点云转换参数
```yaml
depth_to_pointcloud:
  ros__parameters:
    # 输入话题
    depth_image_topic: "/p100r/depth/image_rect_raw"
    depth_info_topic: "/p100r/depth/camera_info"
    color_image_topic: "/p100r/color/image_raw"
    
    # 输出话题
    pointcloud_topic: "/p100r/depth/colored_points"
    
    # 转换参数
    queue_size: 10
    use_color: true
    max_depth: 10.0  # 最大深度 (m)
    min_depth: 0.3   # 最小深度 (m)
    
    # 性能优化
    use_gpu: true
    downsample_factor: 2
```

## TF 坐标变换

P100R 安装在机器人前方，略微向下倾斜 10°：

```xml
<!-- P100R 相机基座 -->
<node pkg="tf2_ros" exec="static_transform_publisher"
      name="p100r_tf_publisher"
      args="0.15 0 0.25 0 -0.1745 0 base_link p100r_link"/>

<!-- 深度光学中心 -->
<node pkg="tf2_ros" exec="static_transform_publisher"
      name="p100r_depth_optical_tf"
      args="0 0 0 -1.5708 0 -1.5708 p100r_link p100r_depth_optical_frame"/>
```

## 使用示例

### 启动相机驱动
```bash
ros2 launch zhuo_rm_navigation p100r_driver.launch.py
```

### 启动点云转换
```bash
ros2 launch zhuo_rm_navigation p100r_pointcloud.launch.py
```

### 可视化
```bash
# RViz 查看点云
ros2 run rviz2 rviz2

# 在 RViz 中添加 PointCloud2 显示
# 话题: /p100r/depth/colored_points
# Fixed Frame: base_link
```

## 话题输出

### 原始数据
- `/p100r/color/image_raw`: RGB 图像
- `/p100r/depth/image_rect_raw`: 深度图像
- `/p100r/depth/camera_info`: 相机内参
- `/p100r/color/camera_info`: RGB 相机内参

### 处理后数据
- `/p100r/depth/points`: 深度点云 (无颜色)
- `/p100r/depth/colored_points`: RGB 彩色点云

## 依赖项

```bash
# ROS2 深度图像处理
sudo apt install ros-humble-depth-image-proc
sudo apt install ros-humble-image-proc
sudo apt install ros-humble-image-pipeline

# P100R 相机 SDK (假设使用 RealSense 类似接口)
# 根据实际 P100R SDK 文档安装
```

## 性能优化

### GPU 加速
启用 CUDA 加速深度图处理：
```yaml
use_gpu: true
gpu_device_id: 0
```

### 降采样
减少点云密度以提高性能：
```yaml
downsample_factor: 2  # 1/4 点数
voxel_grid_size: 0.01 # 1cm 体素滤波
```

### 多线程
启用多线程处理：
```yaml
num_threads: 4
```

## 标定

### 相机内参标定
```bash
ros2 run camera_calibration cameracalibrator \
  --size 8x6 --square 0.024 \
  image:=/p100r/color/image_raw \
  camera:=/p100r/color
```

### 与 LiDAR 外参标定
使用 `lidar_camera_calibration` 工具进行外参标定。

## 故障排查

### 相机无法打开
1. 检查 USB 连接
2. 验证设备权限：`ls -l /dev/video*`
3. 重新插拔相机

### 点云质量差
1. 调整 `spatial_filter` 和 `temporal_filter`
2. 增加 `intensity_threshold`
3. 检查光照条件

### 性能问题
1. 降低分辨率或帧率
2. 增加降采样因子
3. 启用 GPU 加速
