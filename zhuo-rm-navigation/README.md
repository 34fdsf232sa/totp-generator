# Zhuo-RM Multi-Sensor Fusion Navigation System

基于 ROS2 的多传感器融合导航系统，适用于 RM 机器人平台。

## 📋 系统架构

```
zhuo-rm-navigation/
├── sensor_fusion/          # 多传感器融合模块
│   ├── mid70_driver/      # DJI Livox Mid70 激光雷达驱动
│   ├── l2_driver/         # 宇树 L2 激光雷达驱动
│   ├── p100r_pointcloud/  # P100R 深度相机点云转换
│   └── pointcloud_fusion/ # 点云融合节点
├── slam_mapping/          # SLAM 建图模块
│   ├── fast_lio2/        # FAST-LIO2 实时激光惯性建图
│   └── rtabmap_config/   # RTAB-Map RGB-D 回环检测配置
├── vision_tracking/       # 视觉追踪模块
│   ├── yolo_detector/    # YOLOv8 目标检测
│   ├── deepsort_tracker/ # DeepSORT 目标追踪
│   └── target_localizer/ # 3D 目标定位
├── navigation/           # 导航规划模块
│   ├── nav2_config/     # Nav2 导航配置
│   ├── behavior_tree/   # 行为树定义
│   └── tracking_planner/# 追踪导航规划器
└── launch/              # 启动文件
```

## 🚀 功能特性

### 1. 多 LiDAR 融合 (Mid70 + 宇树L2)
- ✅ **DJI Livox Mid70**: 非重复扫描模式，FOV 70°，前向高精度感知
- ✅ **Unitree L2**: 360° 扫描，全向环境感知
- 🔧 **融合策略**: 时间同步对齐 + TF 坐标系变换 + PCL 点云配准

### 2. P100R 深度相机点云融合
- 📷 **RGB-D 融合**: 深度图转换为 PointCloud2 消息
- 🎯 **补充盲区**: 覆盖 LiDAR 近距离盲区 (0.3-10m)
- ⚡ **优化处理**: GPU 加速深度图处理，硬件时间戳同步

### 3. 实时 SLAM 建图
- **FAST-LIO2**: 超高速 LiDAR-Inertial 紧耦合 (>100Hz)
  - 支持 Livox Mid70 非重复扫描模式
  - IMU 紧耦合提升精度
- **RTAB-Map**: RGB-D + LiDAR 融合
  - 回环检测增强长时间运行稳定性
  - 多传感器融合建图

### 4. 视觉追踪 + 避障导航
```
YOLOv8 检测 → DeepSORT 追踪 → 深度融合 → TF 定位 → Nav2 导航
     ↓             ↓             ↓           ↓          ↓
  目标2D框      ID追踪       目标3D位置   全局坐标   动态避障
```

**脱锁重追踪能力:**
- 🎯 **DeepSORT**: 卡尔曼滤波预测 + ReID 特征匹配 (5-10帧脱锁鲁棒)
- 🏃 **ByteTrack**: 低置信度检测框关联 (遮挡场景强)
- 📡 **LiDAR 辅助**: 点云聚类辅助重定位

### 5. Nav2 自主导航
- 🗺️ **全局路径规划**: A* / Dijkstra
- 🎮 **局部控制器**: DWA (Dynamic Window Approach)
- 🌳 **行为树**: 复杂任务编排
- 🎯 **目标追踪**: 动态目标跟随与避障

## 📦 依赖项

### ROS2 依赖
```bash
sudo apt install ros-humble-desktop-full
sudo apt install ros-humble-navigation2
sudo apt install ros-humble-nav2-bringup
sudo apt install ros-humble-rtabmap-ros
sudo apt install ros-humble-image-transport
sudo apt install ros-humble-depth-image-proc
sudo apt install ros-humble-pointcloud-to-laserscan
```

### 传感器驱动
```bash
# Livox SDK2 (Mid70)
git clone https://github.com/Livox-SDK/Livox-SDK2.git
cd Livox-SDK2 && mkdir build && cd build
cmake .. && make && sudo make install

# 宇树 L2 驱动
# 参考: https://github.com/unitreerobotics/unitree_lidar_ros2

# P100R 深度相机 SDK
# 参考官方 SDK 文档
```

### SLAM 算法
```bash
# FAST-LIO2
cd ~/ros2_ws/src
git clone https://github.com/hku-mars/FAST_LIO.git --recursive

# 编译
cd ~/ros2_ws
colcon build --packages-select fast_lio
```

### 视觉算法
```bash
# YOLOv8
pip3 install ultralytics

# DeepSORT
pip3 install deep-sort-realtime
```

## 🔧 安装与构建

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
echo "source ~/rm_nav_ws/install/setup.bash" >> ~/.bashrc
source ~/.bashrc
```

## 🎮 使用方法

### 1. 启动多传感器融合
```bash
ros2 launch zhuo_rm_navigation sensor_fusion.launch.py
```

### 2. 启动 SLAM 建图
```bash
# FAST-LIO2 建图
ros2 launch zhuo_rm_navigation fast_lio2_mapping.launch.py

# RTAB-Map RGB-D 建图
ros2 launch zhuo_rm_navigation rtabmap_mapping.launch.py
```

### 3. 启动视觉追踪
```bash
ros2 launch zhuo_rm_navigation vision_tracking.launch.py
```

### 4. 启动导航系统
```bash
ros2 launch zhuo_rm_navigation navigation.launch.py map:=/path/to/your/map.yaml
```

### 5. 完整系统启动
```bash
ros2 launch zhuo_rm_navigation full_system.launch.py
```

## 📊 技术参数

| 组件 | 参数 | 说明 |
|------|------|------|
| **Mid70** | FOV: 70° | 非重复扫描，前向精度高 |
| **Unitree L2** | FOV: 360° | 全向扫描，环境感知 |
| **P100R** | 范围: 0.3-10m | RGB-D，补充近距盲区 |
| **FAST-LIO2** | 频率: >100Hz | LiDAR-Inertial 紧耦合 |
| **YOLOv8** | FPS: 30-60 | 实时目标检测 |
| **DeepSORT** | 追踪: 5-10帧 | 脱锁鲁棒追踪 |
| **Nav2** | 规划: 10Hz | 动态避障导航 |

## 🔍 故障排查

### 常见问题

1. **LiDAR 数据不同步**
   - 检查时间戳配置
   - 使用 `message_filters` 进行时间同步
   - 验证 TF 树完整性

2. **点云融合性能问题**
   - 降低点云密度 (VoxelGrid 滤波)
   - 启用 GPU 加速
   - 调整融合频率

3. **SLAM 漂移**
   - 检查 IMU 校准
   - 调整 FAST-LIO2 参数
   - 启用 RTAB-Map 回环检测

4. **追踪丢失**
   - 调整 DeepSORT 阈值
   - 启用 LiDAR 辅助追踪
   - 优化 YOLOv8 检测参数

## 📝 配置文件说明

- `sensor_fusion/config/`: 传感器融合参数配置
- `slam_mapping/config/`: SLAM 算法参数
- `vision_tracking/config/`: 视觉算法配置
- `navigation/config/`: 导航参数配置
- `launch/`: 各模块启动文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 MIT 许可证。

## 👥 联系方式

- **维护者**: Zhuo RM Team
- **问题反馈**: GitHub Issues
- **技术讨论**: 请在 Discussions 中参与

## 🙏 致谢

- [FAST-LIO2](https://github.com/hku-mars/FAST_LIO)
- [RTAB-Map](https://github.com/introlab/rtabmap_ros)
- [Nav2](https://github.com/ros-planning/navigation2)
- [Livox SDK](https://github.com/Livox-SDK/Livox-SDK2)
- [YOLOv8](https://github.com/ultralytics/ultralytics)
