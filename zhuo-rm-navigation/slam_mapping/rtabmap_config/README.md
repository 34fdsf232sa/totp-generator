# RTAB-Map RGB-D 回环检测配置

## 功能说明
RTAB-Map (Real-Time Appearance-Based Mapping) 是一个 RGB-D 和 LiDAR SLAM 系统，专注于回环检测和大场景建图。

## 技术特点
- 🔄 **回环检测**: 基于视觉特征的强鲁棒回环
- 🗺️ **增量建图**: 支持长时间运行
- 📷 **多传感器**: RGB-D + LiDAR 融合
- 💾 **内存管理**: 自动地图压缩和优化

## 配置文件

### rtabmap_rgbd.yaml
```yaml
rtabmap:
  ros__parameters:
    # 核心参数
    frame_id: "base_link"
    map_frame_id: "map"
    odom_frame_id: "odom"
    publish_tf: true
    
    # 数据库
    database_path: "~/.ros/rtabmap.db"
    
    # RTAB-Map 参数
    Rtabmap/DetectionRate: "1.0"          # 关键帧率 (Hz)
    Rtabmap/TimeThr: "0"                  # 时间阈值 (0=无限制)
    Rtabmap/MemoryThr: "0"                # 内存阈值 (0=无限制)
    
    # 回环检测
    Mem/IncrementalMemory: "true"         # 增量建图
    Mem/InitWMWithAllNodes: "false"
    
    # 视觉参数
    Vis/MinInliers: "15"                  # 最小内点数
    Vis/MaxDepth: "10.0"                  # 最大深度 (m)
    Vis/MinDepth: "0.3"                   # 最小深度 (m)
    Vis/CorType: "0"                      # 0=特征匹配, 1=光流
    
    # 特征提取
    Kp/DetectorStrategy: "6"              # 6=GFTT/BRIEF
    Kp/MaxFeatures: "400"
    Kp/MinDepth: "0.3"
    Kp/MaxDepth: "10.0"
    
    # 里程计
    Odom/Strategy: "0"                    # 0=Frame-to-Map, 1=Frame-to-Frame
    Odom/ResetCountdown: "1"
    
    # 图优化
    RGBD/OptimizeFromGraphEnd: "false"
    RGBD/OptimizeMaxError: "3.0"
    Optimizer/Strategy: "1"               # 1=g2o, 2=GTSAM
    
    # LiDAR 融合
    Grid/FromDepth: "false"               # 使用 LiDAR 而非深度图
    Grid/RangeMax: "20.0"
    Grid/CellSize: "0.05"                 # 5cm 栅格
```

### rtabmap_lidar_fusion.yaml
```yaml
rtabmap_lidar:
  ros__parameters:
    # 输入话题
    subscribe_depth: true
    subscribe_rgb: true
    subscribe_scan_cloud: true
    
    # 话题名称
    rgb_topic: "/p100r/color/image_raw"
    depth_topic: "/p100r/depth/image_rect_raw"
    camera_info_topic: "/p100r/depth/camera_info"
    scan_cloud_topic: "/fused_pointcloud"
    
    # 输出话题
    map_topic: "/rtabmap/cloud_map"
    odom_topic: "/rtabmap/odom"
    
    # 同步
    queue_size: 10
    approx_sync: true
    approx_sync_max_interval: 0.0
    
    # LiDAR 参数
    scan_voxel_size: 0.05             # 5cm 体素
    scan_normal_k: 10
    
    # ICP 配置
    Icp/MaxTranslation: "2.0"
    Icp/MaxRotation: "0.78"           # 45度
    Icp/VoxelSize: "0.05"
    Icp/PointToPlaneK: "5"
    Icp/PointToPlaneRadius: "0.3"
    Icp/MaxCorrespondenceDistance: "0.1"
```

## 融合方案

### RGB-D + LiDAR 融合架构
```
┌───────────┐
│  P100R    │ RGB-D 数据
│ (RGB-D)   │
└─────┬─────┘
      │
      ├──────────┐
      │          │
      ▼          ▼
┌──────────┐  ┌──────────┐
│ 视觉里程计│  │ 回环检测 │
└────┬─────┘  └────┬─────┘
     │             │
     └──────┬──────┘
            │
            ▼
      ┌──────────┐
      │ 位姿估计 │
      └─────┬────┘
            │
      ┌─────▼─────┐
      │融合点云    │ ← LiDAR (Mid70+L2)
      │(LiDAR)    │
      └─────┬─────┘
            │
            ▼
      ┌──────────┐
      │ 全局地图 │
      └──────────┘
```

## 使用示例

### 启动 RTAB-Map 建图
```bash
# RGB-D SLAM
ros2 launch zhuo_rm_navigation rtabmap_rgbd.launch.py

# RGB-D + LiDAR 融合
ros2 launch zhuo_rm_navigation rtabmap_lidar_fusion.launch.py
```

### 实时可视化
```bash
# RTAB-Map 可视化工具
ros2 run rtabmap_viz rtabmap_viz

# RViz
ros2 run rviz2 rviz2 -d rtabmap.rviz
```

### 离线分析
```bash
# 打开数据库
rtabmap-databaseViewer ~/.ros/rtabmap.db

# 导出地图
rtabmap-export --poses  # 导出轨迹
rtabmap-export --map    # 导出点云地图
```

### 定位模式
```bash
# 使用已有地图进行定位 (无建图)
ros2 launch zhuo_rm_navigation rtabmap_localization.launch.py \
    database_path:=/path/to/rtabmap.db
```

## 话题输出

### 发布话题
- `/rtabmap/cloud_map`: 全局点云地图
- `/rtabmap/grid_map`: 2D 占据栅格地图
- `/rtabmap/odom`: 视觉里程计
- `/rtabmap/mapData`: 地图数据 (用于可视化)
- `/rtabmap/info`: RTAB-Map 统计信息

### 订阅话题
- `/p100r/color/image_raw`: RGB 图像
- `/p100r/depth/image_rect_raw`: 深度图像
- `/p100r/depth/camera_info`: 相机内参
- `/fused_pointcloud`: 融合 LiDAR 点云

## TF 要求

RTAB-Map 需要以下 TF 变换：
```
map → odom → base_link → p100r_link
                      └→ livox_frame
```

## 性能优化

### 1. 降低关键帧率
```yaml
Rtabmap/DetectionRate: "0.5"  # 2秒一帧
```

### 2. 限制特征点数量
```yaml
Kp/MaxFeatures: "200"  # 减少到 200
```

### 3. 启用内存管理
```yaml
Mem/STMSize: "30"              # 短期记忆大小
Mem/RehearsalSimilarity: "0.6" # 相似度阈值
```

### 4. GPU 加速
```yaml
Vis/CorGuessWinSize: "20"  # GPU 光流窗口
```

## 参数调优

### 室内环境
```yaml
Vis/MinInliers: "10"      # 降低内点要求
Kp/MaxFeatures: "600"     # 增加特征点
```

### 室外大场景
```yaml
Vis/MaxDepth: "20.0"      # 增加深度范围
Grid/RangeMax: "30.0"     # 增大栅格范围
```

### 高速运动
```yaml
Odom/Strategy: "1"        # Frame-to-Frame
Vis/MaxDepth: "5.0"       # 减小深度范围
```

## 回环检测调优

### 保守策略 (高精度)
```yaml
Mem/RehearsalSimilarity: "0.8"  # 高相似度阈值
Vis/MinInliers: "20"            # 高内点要求
```

### 激进策略 (多回环)
```yaml
Mem/RehearsalSimilarity: "0.5"  # 低相似度阈值
Vis/MinInliers: "10"            # 低内点要求
```

## 依赖项

```bash
# RTAB-Map
sudo apt install ros-humble-rtabmap-ros
sudo apt install ros-humble-rtabmap-viz

# 图优化库
sudo apt install libg2o-dev
sudo apt install libgtsam-dev

# 可选: GPU 加速
sudo apt install ros-humble-cv-bridge
sudo apt install libopencv-cuda-dev
```

## 故障排查

### 回环检测失败
1. 检查特征点数量: `Kp/MaxFeatures`
2. 降低相似度阈值: `Mem/RehearsalSimilarity`
3. 增加运行时间积累更多数据

### 内存占用过高
1. 启用内存管理: `Mem/STMSize`
2. 减少关键帧率: `Rtabmap/DetectionRate`
3. 清理旧数据库

### 建图偏移
1. 检查相机标定
2. 调整 ICP 参数
3. 启用回环检测

### 性能问题
1. 降低分辨率
2. 减少特征点
3. 使用 GPU 加速

## 评估指标

### 回环准确率
```bash
# 查看回环统计
ros2 topic echo /rtabmap/info | grep loop
```

### 轨迹精度
使用 evo 工具评估:
```bash
evo_traj bag rtabmap.bag /rtabmap/odom --plot
```

## 数据库管理

### 重置数据库
```bash
rm ~/.ros/rtabmap.db
```

### 合并数据库
```bash
rtabmap-reprocess map1.db map2.db -o merged.db
```

### 优化数据库
```bash
rtabmap-reprocess input.db -o output.db
```

## 参考资源
- [RTAB-Map Wiki](https://github.com/introlab/rtabmap/wiki)
- [ROS2 RTAB-Map](https://github.com/introlab/rtabmap_ros/tree/ros2)
- [参数文档](https://github.com/introlab/rtabmap/blob/master/corelib/include/rtabmap/core/Parameters.h)
