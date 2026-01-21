# FAST-LIO2 实时激光惯性建图

## 功能说明
FAST-LIO2 是一个高性能的 LiDAR-Inertial 紧耦合 SLAM 算法，支持 Livox 非重复扫描雷达。

## 技术特点
- ⚡ **超高速**: >100Hz 实时建图
- 🎯 **IMU 紧耦合**: 增强动态场景鲁棒性
- 📊 **非重复扫描**: 原生支持 Livox Mid70
- 🗺️ **iKD-Tree**: 高效地图管理

## 配置文件

### fast_lio2_mid70.yaml
```yaml
common:
    lid_topic:  "/livox/lidar"
    imu_topic:  "/livox/imu"
    time_sync_en: false         # ONLY turn on when external time synchronization is really not possible
    
preprocess:
    lidar_type: 1                # 1: Livox serials LiDAR
    scan_line: 6
    blind: 0.5                   # 盲区距离 (m)
    
mapping:
    acc_cov: 0.1
    gyr_cov: 0.1
    b_acc_cov: 0.0001
    b_gyr_cov: 0.0001
    fov_degree:    180
    det_range:     100.0
    extrinsic_est_en:  false      # true: 自动估计外参
    extrinsic_T: [ 0.0, 0.0, 0.28]  # LiDAR 到 IMU 的平移
    extrinsic_R: [ 1, 0, 0,
                   0, 1, 0,
                   0, 0, 1]

publish:
    path_en:  true
    scan_publish_en:  true       # 发布当前扫描
    dense_publish_en: true       # 发布密集地图
    scan_bodyframe_pub_en: false

pcd_save:
    pcd_save_en: true
    interval: -1                 # -1: 程序结束时保存
    pcd_save_path: "/home/user/maps/"
```

### fast_lio2_config.yaml (ROS2 参数)
```yaml
fast_lio2:
  ros__parameters:
    # 话题配置
    pointcloud_topic: "/livox/lidar"
    imu_topic: "/livox/imu"
    map_frame: "map"
    body_frame: "body"
    
    # 地图发布
    publish_map: true
    map_publish_interval: 0.1  # 10Hz
    
    # 路径发布
    publish_path: true
    path_topic: "/fast_lio/path"
    
    # TF 发布
    publish_tf: true
    tf_publish_interval: 0.01  # 100Hz
```

## IMU 配置

### IMU 内参
根据使用的 IMU 型号配置噪声参数：

```yaml
# 加速度计噪声 (m/s^2)
accelerometer_noise_density: 0.01
accelerometer_random_walk: 0.0002

# 陀螺仪噪声 (rad/s)
gyroscope_noise_density: 0.001
gyroscope_random_walk: 0.00002
```

### IMU-LiDAR 外参标定

#### 方法 1: 手动测量
测量 LiDAR 到 IMU 的相对位置和姿态：
```yaml
extrinsic_T: [0.0, 0.0, 0.28]  # [x, y, z] in meters
extrinsic_R: [1, 0, 0,
              0, 1, 0,
              0, 0, 1]           # 旋转矩阵
```

#### 方法 2: 自动标定
```yaml
extrinsic_est_en: true  # 启用在线外参估计
```

## 使用示例

### 启动建图
```bash
ros2 launch zhuo_rm_navigation fast_lio2_mapping.launch.py
```

### 实时可视化
```bash
# RViz 配置
ros2 run rviz2 rviz2 -d fast_lio2.rviz

# 在 RViz 中添加：
# - PointCloud2: /cloud_registered (建图点云)
# - Path: /fast_lio/path (轨迹)
# - TF
```

### 保存地图
```bash
# 方法 1: 自动保存 (参数配置)
pcd_save_en: true
interval: -1  # 程序结束时保存

# 方法 2: 手动保存
ros2 service call /save_map std_srvs/srv/Trigger
```

### 查看建图质量
```bash
# 查看帧率
ros2 topic hz /cloud_registered

# 查看 IMU 数据
ros2 topic echo /livox/imu

# 查看 TF 树
ros2 run tf2_tools view_frames
```

## 话题输出

### 发布话题
- `/cloud_registered`: 配准后的点云
- `/Odometry`: LiDAR 里程计
- `/fast_lio/path`: 机器人轨迹
- `/fast_lio/map`: 全局地图点云

### 订阅话题
- `/livox/lidar`: Livox 点云输入
- `/livox/imu`: IMU 数据输入

## TF 树结构
```
map
 └── body (base_link)
      └── livox_frame
           └── imu_link (可选)
```

## 性能优化

### 1. 调整地图更新频率
```yaml
map_publish_interval: 0.2  # 降低到 5Hz 减少计算
```

### 2. 限制地图范围
```yaml
det_range: 50.0  # 减小到 50m
fov_degree: 120  # 限制 FOV
```

### 3. 降采样输入点云
```yaml
preprocess:
    point_filter_num: 2  # 每 2 个点取 1 个
```

## 参数调优指南

### 动态场景
```yaml
acc_cov: 0.5      # 增大加速度协方差
gyr_cov: 0.5      # 增大陀螺仪协方差
```

### 高速运动
```yaml
b_acc_cov: 0.001  # 增大加速度偏置协方差
b_gyr_cov: 0.001  # 增大陀螺仪偏置协方差
```

### 大场景
```yaml
det_range: 150.0  # 增大检测范围
cube_side_length: 1000  # 增大地图立方体边长
```

## 依赖项

```bash
# FAST-LIO2 源码
cd ~/ros2_ws/src
git clone https://github.com/hku-mars/FAST_LIO.git --recursive

# 依赖
sudo apt install ros-humble-pcl-ros
sudo apt install ros-humble-pcl-conversions
sudo apt install libeigen3-dev

# 编译
cd ~/ros2_ws
colcon build --packages-select fast_lio
source install/setup.bash
```

## 故障排查

### 建图失败
1. 检查 IMU 数据频率 (应 >100Hz)
2. 验证 IMU-LiDAR 时间同步
3. 检查外参配置

### 漂移严重
1. 标定 IMU 内参
2. 调整协方差参数
3. 检查 IMU 安装 (避免震动)

### 性能问题
1. 降低地图发布频率
2. 限制检测范围
3. 启用点云降采样

## 评估指标

### 建图质量
- **轨迹精度**: 使用 evo 工具评估
- **地图一致性**: CloudCompare 对比
- **回环精度**: 手动检查关键位置

### 实时性
- **频率**: >50Hz (理想 >100Hz)
- **延迟**: <20ms
- **CPU 占用**: <80%

## 参考资源
- [FAST-LIO2 论文](https://arxiv.org/abs/2107.06829)
- [GitHub 仓库](https://github.com/hku-mars/FAST_LIO)
- [配置示例](https://github.com/hku-mars/FAST_LIO/tree/main/config)
