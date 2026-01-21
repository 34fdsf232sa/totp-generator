# 目标 3D 定位模块

## 功能说明
将 2D 追踪目标与深度信息融合，计算目标在 3D 空间的全局坐标。

## 技术流程

```
┌──────────────┐
│DeepSORT轨迹  │ 2D 边界框 + ID
└──────┬───────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│P100R深度图  │  │  相机内参   │
└──────┬──────┘  └──────┬──────┘
       │                │
       └────────┬───────┘
                ▼
       ┌─────────────────┐
       │ 像素 → 相机坐标 │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │  TF 坐标变换    │
       │  camera → base  │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │  TF 坐标变换    │
       │   base → map    │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │  3D 目标位置    │
       │  (全局坐标)     │
       └─────────────────┘
```

## 配置文件

### target_localizer.yaml
```yaml
target_localizer:
  ros__parameters:
    # 输入话题
    tracks_topic: "/deepsort/tracks"
    depth_image_topic: "/p100r/depth/image_rect_raw"
    camera_info_topic: "/p100r/depth/camera_info"
    
    # 输出话题
    targets_3d_topic: "/targets/positions_3d"
    markers_topic: "/targets/markers"
    
    # 坐标系
    camera_frame: "p100r_depth_optical_frame"
    base_frame: "base_link"
    map_frame: "map"
    
    # 深度处理
    depth_scale: 0.001            # mm to m
    min_depth: 0.3                # 最小有效深度 (m)
    max_depth: 10.0               # 最大有效深度 (m)
    depth_filter_size: 5          # 中值滤波核大小
    
    # 目标检测区域
    roi_scale: 0.8                # ROI 缩放 (0.8 = 中心 80%)
    use_bbox_center: true         # 使用边界框中心
    use_median_depth: true        # 使用中值深度
    
    # 滤波器
    enable_kalman_filter: true    # 卡尔曼滤波平滑
    process_noise: 0.1
    measurement_noise: 0.5
    
    # 发布频率
    publish_rate: 30.0            # Hz
    publish_markers: true         # 发布 RViz 标记
```

## 消息定义

### Target3D.msg
```msg
std_msgs/Header header
int32 track_id                  # 追踪 ID
string class_name               # 目标类别

# 相机坐标系
geometry_msgs/Point position_camera

# 机器人坐标系
geometry_msgs/Point position_base
geometry_msgs/Vector3 velocity_base

# 全局坐标系
geometry_msgs/PoseStamped pose_global

# 深度信息
float32 depth                   # 深度值 (m)
float32 depth_confidence        # 深度置信度 [0-1]

# 追踪信息
int32 age                       # 轨迹年龄
float32 tracking_confidence     # 追踪置信度
```

### Target3DArray.msg
```msg
std_msgs/Header header
Target3D[] targets
int32 total_targets
```

## 坐标变换

### 像素到相机坐标
```python
# 相机内参矩阵
fx, fy = camera_info.K[0], camera_info.K[4]
cx, cy = camera_info.K[2], camera_info.K[5]

# 深度值
depth = depth_image[v, u] * depth_scale

# 3D 坐标 (相机坐标系)
x_camera = (u - cx) * depth / fx
y_camera = (v - cy) * depth / fy
z_camera = depth
```

### 相机到机器人坐标
```python
# 使用 TF2
tf_buffer = Buffer()
tf_listener = TransformListener(tf_buffer)

transform = tf_buffer.lookup_transform(
    'base_link',
    'p100r_depth_optical_frame',
    rclpy.time.Time()
)

point_base = do_transform_point(point_camera, transform)
```

### 机器人到全局坐标
```python
# 获取机器人位姿
transform_map = tf_buffer.lookup_transform(
    'map',
    'base_link',
    rclpy.time.Time()
)

pose_global = do_transform_pose(pose_base, transform_map)
```

## 使用示例

### 启动定位节点
```bash
ros2 launch zhuo_rm_navigation target_localizer.launch.py
```

### 完整视觉系统
```bash
# 检测 + 追踪 + 定位
ros2 launch zhuo_rm_navigation full_vision_system.launch.py
```

### 可视化 3D 位置
```bash
# RViz 查看标记
ros2 run rviz2 rviz2

# 添加 MarkerArray 显示
# 话题: /targets/markers
```

### 查看目标位置
```bash
# 监控目标数量
ros2 topic echo /targets/positions_3d | grep total_targets

# 查看具体目标
ros2 topic echo /targets/positions_3d
```

## 话题接口

### 订阅话题
- `/deepsort/tracks`: 2D 追踪结果
- `/p100r/depth/image_rect_raw`: 深度图像
- `/p100r/depth/camera_info`: 相机内参

### 发布话题
- `/targets/positions_3d`: 3D 目标位置 (Target3DArray)
- `/targets/markers`: RViz 可视化标记 (visualization_msgs/MarkerArray)
- `/targets/selected_target`: 选中的目标 (Target3D)

## 深度处理

### 1. 中值滤波
```python
# 提取 ROI 深度值
roi_depth = depth_image[
    y_min:y_max,
    x_min:x_max
]

# 中值滤波
filtered_depth = cv2.medianBlur(roi_depth, kernel_size=5)

# 取中心区域中值
center_region = filtered_depth[
    h//4:3*h//4,
    w//4:3*w//4
]
depth = np.median(center_region[center_region > 0])
```

### 2. 深度置信度
```python
def compute_depth_confidence(depth_roi):
    """计算深度置信度"""
    valid_pixels = depth_roi[depth_roi > 0]
    
    if len(valid_pixels) < 10:
        return 0.0
    
    # 标准差越小，置信度越高
    std = np.std(valid_pixels)
    confidence = 1.0 / (1.0 + std)
    
    return confidence
```

### 3. 异常值过滤
```python
# 过滤异常深度
if depth < min_depth or depth > max_depth:
    return None

# 过滤跳变
if abs(depth - last_depth) > max_jump:
    return None
```

## 卡尔曼滤波

### 状态向量
```python
# 状态: [x, y, z, vx, vy, vz]
state = [position_x, position_y, position_z,
         velocity_x, velocity_y, velocity_z]
```

### 滤波器实现
```python
from filterpy.kalman import KalmanFilter

kf = KalmanFilter(dim_x=6, dim_z=3)

# 状态转移矩阵
kf.F = np.array([
    [1, 0, 0, dt, 0, 0],
    [0, 1, 0, 0, dt, 0],
    [0, 0, 1, 0, 0, dt],
    [0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 1]
])

# 观测矩阵
kf.H = np.array([
    [1, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0]
])

# 预测
kf.predict()

# 更新
kf.update(measurement)
```

## 性能优化

### 1. ROI 采样
```python
# 仅处理目标区域，而非整张深度图
roi_depth = depth_image[y_min:y_max, x_min:x_max]
```

### 2. 多线程处理
```python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=4) as executor:
    futures = [executor.submit(localize_target, track) 
               for track in tracks]
    results = [f.result() for f in futures]
```

### 3. 批量 TF 变换
```python
# 批量变换所有目标
points_camera = [target.position for target in targets]
points_base = batch_transform(points_camera, transform)
```

## 参数调优

### 近距离目标
```yaml
min_depth: 0.3
max_depth: 5.0
roi_scale: 0.9          # 扩大 ROI
depth_filter_size: 3    # 小滤波核
```

### 远距离目标
```yaml
min_depth: 1.0
max_depth: 20.0
roi_scale: 0.6          # 缩小 ROI (聚焦中心)
depth_filter_size: 7    # 大滤波核
use_median_depth: true  # 使用中值
```

### 动态目标
```yaml
enable_kalman_filter: true
process_noise: 0.2      # 增大过程噪声
measurement_noise: 0.3  # 降低测量噪声权重
```

## 依赖项

```bash
# TF2
sudo apt install ros-humble-tf2-ros
sudo apt install ros-humble-tf2-geometry-msgs

# 滤波器
pip3 install filterpy

# 可视化
sudo apt install ros-humble-visualization-msgs
```

## 故障排查

### TF 错误
```bash
# 检查 TF 树
ros2 run tf2_tools view_frames

# 检查特定变换
ros2 run tf2_ros tf2_echo base_link p100r_depth_optical_frame
```

### 深度值异常
1. 检查相机校准
2. 调整 `depth_scale`
3. 增加滤波器大小

### 定位抖动
1. 启用卡尔曼滤波
2. 增加 `measurement_noise`
3. 使用中值深度

### 性能问题
1. 减小 ROI 范围
2. 降低发布频率
3. 使用多线程

## 评估指标

### 定位精度
```python
# 与真值对比
error = np.linalg.norm(estimated_position - ground_truth)
print(f"Localization error: {error:.3f} m")
```

### 实时性
```bash
# 查看延迟
ros2 topic delay /targets/positions_3d
```

## 参考资源
- [TF2 教程](http://wiki.ros.org/tf2)
- [相机标定](http://wiki.ros.org/camera_calibration)
- [卡尔曼滤波](https://filterpy.readthedocs.io/)
