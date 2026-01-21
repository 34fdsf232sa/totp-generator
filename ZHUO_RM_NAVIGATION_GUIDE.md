# 🤖 Zhuo-RM Multi-Sensor Fusion Navigation System

## 📝 项目概述

本仓库包含了一个完整的基于 ROS2 的多传感器融合导航系统，专为 RM (RoboMaster) 机器人平台设计。

## 🎯 核心功能

### 1️⃣ 多传感器融合 (Multi-Sensor Fusion)
- **DJI Livox Mid70**: 非重复扫描激光雷达，FOV 70°，前向高精度感知
- **宇树 L2**: 360° 激光雷达，全向环境感知
- **P100R 深度相机**: RGB-D 深度感知，补充 LiDAR 近距离盲区
- **点云融合**: 实时多传感器点云融合与滤波

### 2️⃣ 实时 SLAM 建图 (Real-time SLAM)
- **FAST-LIO2**: 超高速 LiDAR-Inertial 紧耦合建图 (>100Hz)
- **RTAB-Map**: RGB-D + LiDAR 融合，强大的回环检测

### 3️⃣ 视觉追踪系统 (Vision Tracking)
- **YOLOv8**: 实时目标检测 (30-60 FPS)
- **DeepSORT**: 多目标追踪，支持脱锁重追踪 (5-10 帧鲁棒)
- **3D 定位**: 融合深度信息的目标 3D 定位

### 4️⃣ 自主导航 (Autonomous Navigation)
- **Nav2**: 全局路径规划 + 局部动态避障
- **行为树**: 复杂任务编排
- **追踪导航**: 动态目标跟随与追踪

## 📂 项目结构

```
zhuo-rm-navigation/
├── README.md                          # 主文档
├── sensor_fusion/                     # 传感器融合模块
│   ├── mid70_driver/                 # DJI Livox Mid70 驱动
│   ├── l2_driver/                    # 宇树 L2 驱动
│   ├── p100r_pointcloud/             # P100R 点云转换
│   └── pointcloud_fusion/            # 点云融合节点
├── slam_mapping/                      # SLAM 建图模块
│   ├── fast_lio2/                    # FAST-LIO2 配置
│   └── rtabmap_config/               # RTAB-Map 配置
├── vision_tracking/                   # 视觉追踪模块
│   ├── yolo_detector/                # YOLOv8 检测器
│   ├── deepsort_tracker/             # DeepSORT 追踪器
│   └── target_localizer/             # 3D 目标定位
├── navigation/                        # 导航规划模块
│   ├── nav2_config/                  # Nav2 配置
│   ├── behavior_tree/                # 行为树定义
│   └── tracking_planner/             # 追踪导航器
└── launch/                            # 启动文件集合
```

## 🚀 快速开始

### 前置依赖
```bash
# ROS2 Humble
sudo apt install ros-humble-desktop-full

# 导航相关
sudo apt install ros-humble-navigation2
sudo apt install ros-humble-nav2-bringup

# SLAM 相关
sudo apt install ros-humble-rtabmap-ros

# 传感器处理
sudo apt install ros-humble-pcl-ros
sudo apt install ros-humble-depth-image-proc
```

### 安装步骤
```bash
# 1. 创建工作空间
mkdir -p ~/rm_nav_ws/src
cd ~/rm_nav_ws/src

# 2. 克隆本仓库
git clone https://github.com/zhuo001/Zhuo-RM-Main.git

# 3. 安装依赖
cd ~/rm_nav_ws
rosdep install --from-paths src --ignore-src -r -y

# 4. 编译
colcon build --symlink-install

# 5. 配置环境
source ~/rm_nav_ws/install/setup.bash
```

### 快速启动
```bash
# 完整系统启动
ros2 launch zhuo_rm_navigation full_system.launch.py \
    map:=/path/to/your/map.yaml
```

## 📖 文档导航

### 传感器配置
- [Mid70 激光雷达驱动](zhuo-rm-navigation/sensor_fusion/mid70_driver/README.md)
- [L2 激光雷达驱动](zhuo-rm-navigation/sensor_fusion/l2_driver/README.md)
- [P100R 深度相机配置](zhuo-rm-navigation/sensor_fusion/p100r_pointcloud/README.md)
- [点云融合配置](zhuo-rm-navigation/sensor_fusion/pointcloud_fusion/README.md)

### SLAM 建图
- [FAST-LIO2 配置](zhuo-rm-navigation/slam_mapping/fast_lio2/README.md)
- [RTAB-Map 配置](zhuo-rm-navigation/slam_mapping/rtabmap_config/README.md)

### 视觉追踪
- [YOLOv8 检测器](zhuo-rm-navigation/vision_tracking/yolo_detector/README.md)
- [DeepSORT 追踪器](zhuo-rm-navigation/vision_tracking/deepsort_tracker/README.md)
- [3D 目标定位](zhuo-rm-navigation/vision_tracking/target_localizer/README.md)

### 导航规划
- [Nav2 配置](zhuo-rm-navigation/navigation/nav2_config/README.md)
- [行为树](zhuo-rm-navigation/navigation/behavior_tree/README.md)
- [追踪导航器](zhuo-rm-navigation/navigation/tracking_planner/README.md)

### 启动文件
- [启动文件说明](zhuo-rm-navigation/launch/README.md)

## 🎮 使用场景

### 场景 1: 建图模式
```bash
# 启动传感器融合 + SLAM 建图
ros2 launch zhuo_rm_navigation mapping.launch.py

# 保存地图
ros2 service call /save_map std_srvs/srv/Trigger
```

### 场景 2: 自主导航
```bash
# 启动导航系统
ros2 launch zhuo_rm_navigation navigation.launch.py \
    map:=~/maps/lab_map.yaml

# 设置导航目标 (通过 RViz)
```

### 场景 3: 目标追踪
```bash
# 启动完整追踪系统
ros2 launch zhuo_rm_navigation full_system.launch.py

# 选择追踪目标
ros2 topic pub /tracking/target_id std_msgs/Int32 "data: 5"

# 开始追踪
ros2 service call /tracking/start std_srvs/srv/Trigger
```

## 📊 技术参数

| 模块 | 参数 | 说明 |
|------|------|------|
| **Mid70** | FOV: 70°, 点频: 100k pts/s | 前向精度感知 |
| **Unitree L2** | FOV: 360°, 频率: 10Hz | 全向环境感知 |
| **P100R** | 范围: 0.3-10m, FPS: 30 | RGB-D 深度感知 |
| **FAST-LIO2** | 频率: >100Hz | LiDAR-Inertial SLAM |
| **RTAB-Map** | 回环检测 | RGB-D + LiDAR 融合 |
| **YOLOv8** | FPS: 30-60 | 实时目标检测 |
| **DeepSORT** | 追踪: 5-10 帧鲁棒 | 多目标追踪 |
| **Nav2** | 频率: 10Hz | 动态避障导航 |

## 🔍 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                     传感器层                            │
│  Mid70 LiDAR │ L2 LiDAR │ P100R RGB-D │ IMU           │
└────────┬────────────────────────────────────┬──────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────┐                  ┌──────────────────┐
│  点云融合       │                  │   视觉检测       │
│  (PCL)          │                  │   (YOLOv8)       │
└────────┬────────┘                  └────────┬─────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────┐                  ┌──────────────────┐
│  SLAM 建图      │                  │   目标追踪       │
│  (FAST-LIO2)    │                  │   (DeepSORT)     │
└────────┬────────┘                  └────────┬─────────┘
         │                                    │
         └──────────────┬─────────────────────┘
                        ▼
               ┌──────────────────┐
               │   3D 目标定位    │
               └────────┬─────────┘
                        ▼
               ┌──────────────────┐
               │   导航规划       │
               │   (Nav2)         │
               └────────┬─────────┘
                        ▼
               ┌──────────────────┐
               │   运动控制       │
               └──────────────────┘
```

## 🛠️ 调试工具

### RViz 可视化
```bash
ros2 run rviz2 rviz2 -d full_system.rviz
```

### Groot 行为树可视化
```bash
groot  # 连接到 localhost:1666
```

### 话题监控
```bash
# 传感器数据
ros2 topic hz /livox/lidar
ros2 topic hz /unitree_lidar/cloud
ros2 topic hz /p100r/depth/points

# 追踪结果
ros2 topic echo /deepsort/tracks
ros2 topic echo /targets/positions_3d

# 导航状态
ros2 topic echo /goal_pose
ros2 topic echo /cmd_vel
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 👥 维护者

- **Zhuo RM Team**
- GitHub: [@zhuo001](https://github.com/zhuo001)

## 🙏 致谢

本项目基于以下开源项目：

- [FAST-LIO2](https://github.com/hku-mars/FAST_LIO) - 高速 LiDAR-Inertial SLAM
- [RTAB-Map](https://github.com/introlab/rtabmap_ros) - RGB-D SLAM
- [Nav2](https://github.com/ros-planning/navigation2) - ROS2 导航框架
- [YOLOv8](https://github.com/ultralytics/ultralytics) - 目标检测
- [DeepSORT](https://github.com/levan92/deep_sort_realtime) - 多目标追踪
- [Livox SDK](https://github.com/Livox-SDK/Livox-SDK2) - Livox 雷达 SDK

## 📞 联系方式

- **问题反馈**: [GitHub Issues](https://github.com/zhuo001/Zhuo-RM-Main/issues)
- **讨论交流**: [GitHub Discussions](https://github.com/zhuo001/Zhuo-RM-Main/discussions)

## 📈 项目状态

- ✅ **传感器融合**: 已完成配置文档
- ✅ **SLAM 建图**: 已完成配置文档
- ✅ **视觉追踪**: 已完成配置文档
- ✅ **导航规划**: 已完成配置文档
- ⏳ **实际部署**: 等待硬件测试
- ⏳ **性能优化**: 持续进行中

## 🔮 未来计划

- [ ] 添加仿真环境支持 (Gazebo)
- [ ] 集成更多传感器 (毫米波雷达等)
- [ ] 多机器人协作导航
- [ ] 深度学习端到端导航
- [ ] 云端地图管理系统

---

**⚠️ 注意**: 本项目仍在积极开发中，部分功能可能需要根据实际硬件进行调整。

**🌟 如果本项目对您有帮助，请给个 Star ⭐**
