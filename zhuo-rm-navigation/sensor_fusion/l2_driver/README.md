# 宇树 L2 激光雷达驱动配置

## 功能说明
宇树 L2 激光雷达驱动模块，提供 360° 全向扫描能力。

## 技术参数
- **FOV**: 360° (水平)
- **扫描频率**: 10 Hz
- **测距范围**: 0.05m - 30m
- **角分辨率**: 0.18° ~ 0.36°
- **点频**: 21,600 点/秒
- **精度**: ±2cm
- **接口**: 以太网

## 配置文件

### l2_config.yaml
```yaml
unitree_lidar:
  ros__parameters:
    # 网络配置
    lidar_ip: "192.168.1.18"
    lidar_port: 56100
    
    # 输出配置
    frame_id: "unitree_lidar_frame"
    scan_topic: "/unitree_lidar/scan"
    cloud_topic: "/unitree_lidar/cloud"
    
    # 扫描参数
    range_min: 0.05
    range_max: 30.0
    angle_min: -3.14159
    angle_max: 3.14159
    
    # 滤波器
    enable_filter: true
    intensity_threshold: 10
```

## TF 坐标变换

L2 安装在机器人中心，z轴向上 0.2m：

```xml
<node pkg="tf2_ros" exec="static_transform_publisher"
      name="l2_tf_publisher"
      args="0 0 0.2 0 0 0 base_link unitree_lidar_frame"/>
```

## 使用示例

### 启动驱动
```bash
ros2 launch zhuo_rm_navigation l2_driver.launch.py
```

### 查看激光扫描
```bash
ros2 run rviz2 rviz2
# 添加 LaserScan 显示，话题选择 /unitree_lidar/scan
```

### 话题输出
- `/unitree_lidar/scan`: sensor_msgs/LaserScan 2D 扫描数据
- `/unitree_lidar/cloud`: sensor_msgs/PointCloud2 3D 点云数据
- `/unitree_lidar/imu`: sensor_msgs/Imu IMU 数据

## 依赖项

从宇树官方仓库安装：
```bash
cd ~/ros2_ws/src
git clone https://github.com/unitreerobotics/unitree_lidar_ros2.git
cd ~/ros2_ws
colcon build --packages-select unitree_lidar_ros2
```

## 故障排查

### 无法连接雷达
1. 检查网络配置：`ping 192.168.1.18`
2. 检查防火墙设置
3. 验证雷达电源

### 数据质量问题
1. 调整 `intensity_threshold` 参数
2. 检查雷达安装位置
3. 清理雷达镜头
