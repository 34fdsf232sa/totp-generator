# DJI Livox Mid70 驱动配置

## 功能说明
DJI Livox Mid70 激光雷达驱动模块，支持非重复扫描模式。

## 技术参数
- **FOV**: 70° (水平) × 77° (垂直)
- **扫描模式**: 非重复扫描 (Non-repetitive)
- **测距范围**: 0.05m - 260m @ 10% 反射率
- **点频**: 100,000 点/秒
- **精度**: ±2cm @ 20m
- **接口**: 以太网

## 配置文件

### mid70_config.json
```json
{
  "lidar_config": [
    {
      "ip": "192.168.1.1",
      "pcl_data_type": 1,
      "pattern_mode": 0,
      "extrinsic_parameter": {
        "roll": 0.0,
        "pitch": 0.0,
        "yaw": 0.0,
        "x": 0.0,
        "y": 0.0,
        "z": 0.3
      }
    }
  ]
}
```

### ROS2 参数配置
```yaml
mid70_driver:
  ros__parameters:
    xfer_format: 0          # 0: PointCloud2, 1: CustomMsg
    multi_topic: 0          # 0: 单topic, 1: 多topic
    data_src: 0             # 0: 网络, 1: ROS bag
    publish_freq: 10.0      # 发布频率 (Hz)
    output_data_type: 0     # 输出类型
    frame_id: "livox_frame"
    user_config_path: "mid70_config.json"
```

## TF 坐标变换

Mid70 安装在机器人前方，z轴向上 0.3m：

```xml
<node pkg="tf2_ros" exec="static_transform_publisher"
      name="mid70_tf_publisher"
      args="0 0 0.3 0 0 0 base_link livox_frame"/>
```

## 使用示例

### 启动驱动
```bash
ros2 launch zhuo_rm_navigation mid70_driver.launch.py
```

### 查看点云
```bash
ros2 run rviz2 rviz2 -d mid70_view.rviz
```

### 话题输出
- `/livox/lidar`: PointCloud2 格式点云数据
- `/livox/imu`: IMU 数据 (如有)

## 依赖项
```bash
sudo apt install ros-humble-livox-ros-driver2
```

或从源码编译：
```bash
cd ~/ros2_ws/src
git clone https://github.com/Livox-SDK/livox_ros_driver2.git
cd ~/ros2_ws
colcon build --packages-select livox_ros_driver2
```
