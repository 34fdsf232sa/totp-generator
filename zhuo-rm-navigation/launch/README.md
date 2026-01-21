# 启动文件说明

## 启动文件列表

### 传感器融合
- `sensor_fusion.launch.py`: 启动所有传感器驱动和点云融合
- `mid70_driver.launch.py`: 单独启动 Mid70 驱动
- `l2_driver.launch.py`: 单独启动 L2 驱动
- `p100r_driver.launch.py`: 单独启动 P100R 驱动
- `pointcloud_fusion.launch.py`: 点云融合节点

### SLAM 建图
- `fast_lio2_mapping.launch.py`: FAST-LIO2 实时建图
- `rtabmap_mapping.launch.py`: RTAB-Map RGB-D 建图
- `rtabmap_lidar_fusion.launch.py`: RTAB-Map + LiDAR 融合建图
- `mapping.launch.py`: 完整建图系统

### 视觉追踪
- `yolo_detector.launch.py`: YOLOv8 检测
- `deepsort_tracker.launch.py`: DeepSORT 追踪
- `target_localizer.launch.py`: 目标 3D 定位
- `vision_tracking.launch.py`: 完整视觉追踪系统

### 导航规划
- `navigation.launch.py`: Nav2 自主导航
- `tracking_navigation.launch.py`: 目标追踪导航
- `localization.launch.py`: 定位 (使用已有地图)

### 完整系统
- `full_system.launch.py`: 启动所有模块

## 使用示例

### 建图模式
```bash
# 1. 启动传感器融合
ros2 launch zhuo_rm_navigation sensor_fusion.launch.py

# 2. 启动 SLAM 建图
ros2 launch zhuo_rm_navigation mapping.launch.py

# 3. 可视化
ros2 run rviz2 rviz2 -d mapping.rviz
```

### 导航模式
```bash
# 1. 启动传感器融合
ros2 launch zhuo_rm_navigation sensor_fusion.launch.py

# 2. 启动定位
ros2 launch zhuo_rm_navigation localization.launch.py \
    map:=/path/to/map.yaml

# 3. 启动导航
ros2 launch zhuo_rm_navigation navigation.launch.py
```

### 目标追踪模式
```bash
# 1. 启动完整系统
ros2 launch zhuo_rm_navigation full_system.launch.py \
    map:=/path/to/map.yaml

# 2. 选择目标
ros2 topic pub /tracking/target_id std_msgs/Int32 "data: 5"

# 3. 开始追踪
ros2 service call /tracking/start std_srvs/srv/Trigger
```

## 完整系统启动文件

```python
# full_system.launch.py
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import PathJoinSubstitution
from launch_ros.substitutions import FindPackageShare
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration

def generate_launch_description():
    # 参数
    map_yaml_file = LaunchConfiguration('map')
    use_sim_time = LaunchConfiguration('use_sim_time')
    
    # 参数声明
    declare_map_arg = DeclareLaunchArgument(
        'map',
        default_value='',
        description='Full path to map yaml file'
    )
    
    declare_use_sim_time_arg = DeclareLaunchArgument(
        'use_sim_time',
        default_value='false',
        description='Use simulation time'
    )
    
    # 传感器融合
    sensor_fusion_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource([
            PathJoinSubstitution([
                FindPackageShare('zhuo_rm_navigation'),
                'launch',
                'sensor_fusion.launch.py'
            ])
        ])
    )
    
    # SLAM 建图 (如果没有提供地图)
    mapping_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource([
            PathJoinSubstitution([
                FindPackageShare('zhuo_rm_navigation'),
                'launch',
                'fast_lio2_mapping.launch.py'
            ])
        ]),
        launch_arguments={'use_sim_time': use_sim_time}.items()
    )
    
    # 定位 (如果提供了地图)
    localization_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource([
            PathJoinSubstitution([
                FindPackageShare('zhuo_rm_navigation'),
                'launch',
                'localization.launch.py'
            ])
        ]),
        launch_arguments={
            'map': map_yaml_file,
            'use_sim_time': use_sim_time
        }.items()
    )
    
    # 视觉追踪
    vision_tracking_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource([
            PathJoinSubstitution([
                FindPackageShare('zhuo_rm_navigation'),
                'launch',
                'vision_tracking.launch.py'
            ])
        ])
    )
    
    # 导航
    navigation_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource([
            PathJoinSubstitution([
                FindPackageShare('zhuo_rm_navigation'),
                'launch',
                'tracking_navigation.launch.py'
            ])
        ]),
        launch_arguments={'use_sim_time': use_sim_time}.items()
    )
    
    # RViz
    rviz_config_file = PathJoinSubstitution([
        FindPackageShare('zhuo_rm_navigation'),
        'rviz',
        'full_system.rviz'
    ])
    
    rviz_node = Node(
        package='rviz2',
        executable='rviz2',
        name='rviz2',
        arguments=['-d', rviz_config_file],
        parameters=[{'use_sim_time': use_sim_time}]
    )
    
    return LaunchDescription([
        declare_map_arg,
        declare_use_sim_time_arg,
        sensor_fusion_launch,
        vision_tracking_launch,
        navigation_launch,
        rviz_node
    ])
```

## 常用参数

### 传感器参数
```bash
# Mid70 IP 地址
mid70_ip:=192.168.1.1

# L2 IP 地址
l2_ip:=192.168.1.18

# P100R 设备 ID
p100r_device:=0
```

### SLAM 参数
```bash
# 地图保存路径
map_save_path:=/home/user/maps/

# 建图模式
mapping_mode:=fast_lio  # fast_lio / rtabmap
```

### 导航参数
```bash
# 地图文件
map:=/path/to/map.yaml

# 使用仿真时间
use_sim_time:=false

# 行为树文件
bt_xml:=track_target.xml
```

## 启动脚本

### 快速启动脚本
```bash
#!/bin/bash
# start_navigation.sh

# 设置环境
source ~/rm_nav_ws/install/setup.bash

# 启动完整系统
ros2 launch zhuo_rm_navigation full_system.launch.py \
    map:=~/maps/lab_map.yaml \
    use_sim_time:=false
```

### 调试启动脚本
```bash
#!/bin/bash
# debug_system.sh

# 启动各模块，便于调试
tmux new-session -d -s navigation

# 传感器窗口
tmux send-keys -t navigation "ros2 launch zhuo_rm_navigation sensor_fusion.launch.py" C-m
tmux split-window -v -t navigation

# SLAM 窗口
tmux send-keys -t navigation "ros2 launch zhuo_rm_navigation fast_lio2_mapping.launch.py" C-m
tmux split-window -v -t navigation

# 视觉窗口
tmux send-keys -t navigation "ros2 launch zhuo_rm_navigation vision_tracking.launch.py" C-m
tmux split-window -v -t navigation

# 导航窗口
tmux send-keys -t navigation "ros2 launch zhuo_rm_navigation navigation.launch.py" C-m

# 连接到 tmux 会话
tmux attach -t navigation
```

## 参考资源
- [ROS2 Launch 文档](https://docs.ros.org/en/humble/Tutorials/Intermediate/Launch/Launch-Main.html)
- [Nav2 启动示例](https://github.com/ros-planning/navigation2/tree/main/nav2_bringup/launch)
