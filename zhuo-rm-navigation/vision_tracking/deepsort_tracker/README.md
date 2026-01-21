# DeepSORT 目标追踪模块

## 功能说明
基于 DeepSORT 的多目标追踪，支持目标 ID 分配、轨迹预测和重识别。

## 技术特点
- 🎯 **鲁棒追踪**: 卡尔曼滤波预测 + ReID 特征匹配
- 🔄 **脱锁恢复**: 5-10 帧短时遮挡鲁棒
- 🆔 **ID 保持**: 长时间稳定的目标 ID
- 🚀 **实时性能**: >30 FPS

## 配置文件

### deepsort_config.yaml
```yaml
deepsort_tracker:
  ros__parameters:
    # 输入配置
    detections_topic: "/yolo/detections"
    image_topic: "/p100r/color/image_raw"
    
    # 输出配置
    tracks_topic: "/deepsort/tracks"
    debug_image_topic: "/deepsort/debug_image"
    
    # DeepSORT 参数
    max_cosine_distance: 0.3      # ReID 相似度阈值
    nn_budget: 100                # 特征库大小
    max_iou_distance: 0.7         # IOU 匹配阈值
    max_age: 30                   # 最大丢失帧数
    n_init: 3                     # 确认轨迹所需帧数
    
    # 卡尔曼滤波
    std_weight_position: 0.05     # 位置不确定度
    std_weight_velocity: 0.00625  # 速度不确定度
    
    # ReID 模型
    reid_model_path: "osnet_x1_0_msmt17.pt"
    reid_device: "cuda:0"
    reid_batch_size: 32
    
    # 性能优化
    enable_reid: true             # 启用 ReID
    use_appearance: true          # 使用外观特征
    use_velocity: true            # 使用速度信息
```

## 追踪流程

```
┌──────────────┐
│ YOLO 检测框  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 卡尔曼预测   │ → 预测目标位置
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 匈牙利匹配   │ → 检测框与轨迹关联
│ (IOU + ReID) │
└──────┬───────┘
       │
       ├──────┬──────┬──────┐
       ▼      ▼      ▼      ▼
   ┌──────┐ ┌────┐ ┌────┐ ┌────┐
   │已匹配│ │新目标│ │丢失│ │删除│
   └──┬───┘ └──┬─┘ └──┬─┘ └────┘
      │        │      │
      ▼        ▼      ▼
   ┌──────────────────┐
   │   更新轨迹       │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────┐
   │ 输出追踪结果 │
   └──────────────┘
```

## 消息定义

### Track.msg
```msg
std_msgs/Header header
int32 track_id              # 轨迹 ID
string class_name           # 目标类别
float32 confidence          # 置信度
float32 x_min               # 边界框
float32 y_min
float32 x_max
float32 y_max
float32 center_x            # 中心点
float32 center_y
float32 velocity_x          # 速度 (像素/秒)
float32 velocity_y
int32 age                   # 轨迹年龄 (帧数)
int32 hits                  # 匹配次数
int32 time_since_update     # 自上次更新的帧数
```

### TrackArray.msg
```msg
std_msgs/Header header
Track[] tracks
int32 total_tracks          # 总追踪数
```

## 使用示例

### 启动追踪节点
```bash
ros2 launch zhuo_rm_navigation deepsort_tracker.launch.py
```

### 完整视觉追踪流程
```bash
# 启动检测 + 追踪
ros2 launch zhuo_rm_navigation vision_tracking.launch.py
```

### 可视化
```bash
# 查看追踪结果
ros2 run rqt_image_view rqt_image_view \
    /deepsort/debug_image

# RViz 可视化
ros2 run rviz2 rviz2 -d vision_tracking.rviz
```

### 监控追踪状态
```bash
# 查看追踪频率
ros2 topic hz /deepsort/tracks

# 查看追踪详情
ros2 topic echo /deepsort/tracks

# 统计信息
ros2 topic echo /deepsort/tracking_stats
```

## 话题接口

### 订阅话题
- `/yolo/detections`: YOLOv8 检测结果 (DetectionArray)
- `/p100r/color/image_raw`: RGB 图像 (用于 ReID)

### 发布话题
- `/deepsort/tracks`: 追踪结果 (TrackArray)
- `/deepsort/debug_image`: 可视化图像 (sensor_msgs/Image)
- `/deepsort/tracking_stats`: 追踪统计 (TrackingStats)

## 参数调优

### 高速运动场景
```yaml
std_weight_velocity: 0.01     # 增大速度不确定度
max_iou_distance: 0.8         # 放宽 IOU 阈值
max_age: 20                   # 减少最大丢失帧
```

### 拥挤场景
```yaml
max_cosine_distance: 0.2      # 严格 ReID 阈值
n_init: 5                     # 增加确认帧数
nn_budget: 200                # 增大特征库
```

### 遮挡场景
```yaml
max_age: 50                   # 增加最大丢失帧
enable_reid: true             # 确保启用 ReID
use_velocity: true            # 使用速度预测
```

### 快速响应
```yaml
n_init: 1                     # 减少确认帧数
max_age: 15                   # 快速删除丢失轨迹
```

## ReID 模型

### 支持的模型
```python
REID_MODELS = {
    'osnet_x1_0': 'osnet_x1_0_msmt17.pt',      # 推荐
    'osnet_x0_75': 'osnet_x0_75_msmt17.pt',    # 轻量
    'osnet_x0_5': 'osnet_x0_5_msmt17.pt',      # 超轻量
    'mobilenet': 'mobilenet_v2_reid.pt',       # 实时
}
```

### 自定义 ReID 训练
```python
# 使用 torchreid 训练
import torchreid

datamanager = torchreid.data.ImageDataManager(
    root='reid-data',
    sources='market1501',
    targets='market1501',
    height=256,
    width=128,
    batch_size_train=32,
    batch_size_test=100,
)

model = torchreid.models.build_model(
    name='osnet_x1_0',
    num_classes=datamanager.num_train_pids,
    loss='softmax',
    pretrained=True
)
```

## 性能优化

### 1. 禁用 ReID (仅 IOU)
```yaml
enable_reid: false
use_appearance: false
# 适用于简单场景，性能提升 50%
```

### 2. 批处理 ReID
```yaml
reid_batch_size: 64      # 增大批量
# 适用于多目标场景
```

### 3. 降低 ReID 频率
```yaml
reid_update_interval: 3  # 每 3 帧更新一次 ReID
```

## 故障排查

### ID 频繁切换
1. 增加 `n_init` 确认帧数
2. 降低 `max_cosine_distance`
3. 检查 ReID 模型效果

### 丢失追踪
1. 增加 `max_age`
2. 放宽 `max_iou_distance`
3. 启用速度预测

### 误匹配
1. 降低 `max_cosine_distance`
2. 增加 `n_init`
3. 改进检测质量

### 性能问题
1. 禁用 ReID
2. 减小 `nn_budget`
3. 降低 ReID 分辨率

## 脱锁重追踪测试

### 测试场景
```python
# 短时遮挡 (5-10 帧)
test_scenarios = {
    'partial_occlusion': {  # 部分遮挡
        'max_age': 30,
        'expected_recovery': 0.9
    },
    'full_occlusion': {     # 完全遮挡
        'max_age': 50,
        'expected_recovery': 0.7
    },
    'out_of_view': {        # 离开视野
        'max_age': 20,
        'expected_recovery': 0.5
    }
}
```

### 评估指标
```bash
# MOTA: Multiple Object Tracking Accuracy
# MOTP: Multiple Object Tracking Precision
# IDF1: ID F1 Score

ros2 run zhuo_rm_navigation eval_tracking \
    --ground_truth ground_truth.txt \
    --predictions /deepsort/tracks
```

## 与其他模块集成

### 与 ByteTrack 混合
```python
# 使用 ByteTrack 处理低置信度检测
if detection.confidence < 0.5:
    bytetrack_result = bytetrack.update(detection)
else:
    deepsort_result = deepsort.update(detection)
```

### 与 LiDAR 融合
```python
# LiDAR 点云聚类辅助重定位
if track.time_since_update > 10:
    lidar_cluster = find_nearest_cluster(track.position)
    track.update_from_lidar(lidar_cluster)
```

## 依赖项

```bash
# DeepSORT
pip3 install deep-sort-realtime

# ReID 模型
pip3 install torchreid

# 可选: ONNX Runtime
pip3 install onnxruntime-gpu

# ROS2 依赖
sudo apt install ros-humble-vision-msgs
```

## 参考资源
- [DeepSORT 论文](https://arxiv.org/abs/1703.07402)
- [Deep SORT Realtime](https://github.com/levan92/deep_sort_realtime)
- [TorchReID](https://github.com/KaiyangZhou/deep-person-reid)
- [MOT Benchmark](https://motchallenge.net/)
