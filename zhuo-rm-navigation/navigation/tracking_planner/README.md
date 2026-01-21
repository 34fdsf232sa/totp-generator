# 追踪导航规划器

## 功能说明
专门用于动态目标追踪的导航规划器，支持实时目标跟随和动态路径更新。

## 技术特点
- 🎯 **动态重规划**: 实时更新目标位置
- 🚀 **预测追踪**: 预测目标运动轨迹
- 🛡️ **安全距离**: 保持与目标的安全间距
- 🔄 **平滑跟随**: 避免急转和急停

## 追踪策略

### 1. 直接跟随
```
目标 → 预测位置 → 规划路径 → 跟随
```

### 2. 保持距离跟随
```
目标 → 预测位置 → 计算偏移 → 规划路径 → 跟随
```

### 3. 包围跟随
```
目标 → 预测位置 → 计算包围点 → 规划路径 → 跟随
```

## 配置文件

### tracking_planner.yaml
```yaml
tracking_planner:
  ros__parameters:
    # 输入话题
    target_topic: "/targets/selected_target"
    odom_topic: "/odom"
    
    # 输出话题
    goal_topic: "/goal_pose"
    path_topic: "/tracking/path"
    
    # 追踪模式
    tracking_mode: "follow"  # follow / offset / surround
    
    # 跟随参数
    target_distance: 1.5          # 目标距离 (m)
    min_distance: 0.8             # 最小距离 (m)
    max_distance: 3.0             # 最大距离 (m)
    
    # 预测参数
    enable_prediction: true       # 启用目标预测
    prediction_time: 1.0          # 预测时间 (s)
    prediction_samples: 5         # 预测采样数
    
    # 速度控制
    max_linear_speed: 0.5         # 最大线速度 (m/s)
    max_angular_speed: 1.0        # 最大角速度 (rad/s)
    max_acceleration: 0.5         # 最大加速度 (m/s²)
    
    # 更新频率
    update_rate: 10.0             # 规划更新频率 (Hz)
    goal_tolerance: 0.3           # 目标容差 (m)
    
    # 安全参数
    obstacle_check_distance: 1.0  # 障碍物检查距离 (m)
    enable_safety_brake: true     # 启用安全刹车
    
    # 平滑参数
    path_smoothing: true          # 路径平滑
    smoothing_window: 5           # 平滑窗口大小
```

### 追踪模式配置

#### 直接跟随模式
```yaml
tracking_mode: "follow"
target_distance: 1.0
approach_speed_factor: 0.8      # 接近时减速系数
```

#### 偏移跟随模式
```yaml
tracking_mode: "offset"
target_distance: 2.0
offset_angle: 0.785             # 45° 侧面跟随 (rad)
offset_distance: 1.5            # 偏移距离 (m)
```

#### 包围模式
```yaml
tracking_mode: "surround"
surround_radius: 2.0            # 包围半径 (m)
surround_angle: 1.57            # 包围角度 90° (rad)
orbit_direction: "ccw"          # 轨道方向: cw/ccw
```

## 核心算法

### 目标预测
```python
def predict_target_position(target, dt):
    """预测目标未来位置"""
    # 使用卡尔曼滤波预测
    predicted_pos = target.position + target.velocity * dt
    
    # 考虑加速度
    if target.has_acceleration:
        predicted_pos += 0.5 * target.acceleration * dt * dt
    
    return predicted_pos
```

### 距离保持
```python
def compute_following_goal(target_pos, robot_pos, target_distance):
    """计算跟随目标点"""
    # 计算方向向量
    direction = (target_pos - robot_pos).normalize()
    
    # 计算目标点 (保持指定距离)
    goal = target_pos - direction * target_distance
    
    return goal
```

### 速度调节
```python
def compute_tracking_velocity(distance_to_target, target_distance):
    """根据距离调节速度"""
    error = distance_to_target - target_distance
    
    # 比例控制
    kp = 0.5
    velocity = kp * error
    
    # 限制速度
    velocity = np.clip(velocity, -max_speed, max_speed)
    
    return velocity
```

### 路径平滑
```python
def smooth_path(path, window_size=5):
    """使用移动平均平滑路径"""
    smoothed = []
    
    for i in range(len(path)):
        start = max(0, i - window_size // 2)
        end = min(len(path), i + window_size // 2 + 1)
        
        avg_point = np.mean(path[start:end], axis=0)
        smoothed.append(avg_point)
    
    return smoothed
```

## 使用示例

### 启动追踪规划器
```bash
ros2 launch zhuo_rm_navigation tracking_planner.launch.py
```

### 选择追踪目标
```bash
# 发布目标 ID
ros2 topic pub /tracking/target_id std_msgs/Int32 "data: 5"

# 或通过服务
ros2 service call /tracking/select_target \
  std_srvs/srv/SetInt \
  "{data: 5}"
```

### 切换追踪模式
```bash
ros2 service call /tracking/set_mode \
  std_msgs/srv/SetString \
  "{data: 'offset'}"
```

### 调整追踪距离
```bash
ros2 param set /tracking_planner target_distance 2.0
```

## 话题接口

### 订阅话题
- `/targets/selected_target`: 选中的目标 (Target3D)
- `/odom`: 机器人里程计 (nav_msgs/Odometry)
- `/targets/positions_3d`: 所有目标位置 (Target3DArray)

### 发布话题
- `/goal_pose`: 导航目标 (geometry_msgs/PoseStamped)
- `/tracking/path`: 追踪路径 (nav_msgs/Path)
- `/tracking/status`: 追踪状态 (TrackingStatus)
- `/tracking/predicted_target`: 预测目标位置 (visualization_msgs/Marker)

### 服务
- `/tracking/select_target`: 选择追踪目标
- `/tracking/set_mode`: 设置追踪模式
- `/tracking/start`: 开始追踪
- `/tracking/stop`: 停止追踪

## 状态机

```
┌─────────┐
│  IDLE   │ 初始状态
└────┬────┘
     │ select_target
     ▼
┌─────────┐
│ WAITING │ 等待目标出现
└────┬────┘
     │ target_detected
     ▼
┌─────────┐
│TRACKING │ 正在追踪
└────┬────┘
     │
     ├─ target_lost → SEARCHING
     ├─ goal_reached → ARRIVED
     └─ stop_command → IDLE

┌──────────┐
│SEARCHING │ 搜索丢失目标
└────┬─────┘
     │
     ├─ target_found → TRACKING
     └─ timeout → IDLE

┌─────────┐
│ ARRIVED │ 到达目标附近
└────┬────┘
     │
     └─ target_moved → TRACKING
```

## 参数调优

### 高速追踪
```yaml
max_linear_speed: 1.0
max_acceleration: 1.0
update_rate: 20.0
prediction_time: 1.5
```

### 精确跟随
```yaml
target_distance: 0.8
goal_tolerance: 0.2
update_rate: 15.0
path_smoothing: true
```

### 远距离追踪
```yaml
target_distance: 3.0
max_distance: 5.0
prediction_time: 2.0
enable_prediction: true
```

### 密集环境
```yaml
obstacle_check_distance: 1.5
enable_safety_brake: true
min_distance: 1.0
```

## 性能优化

### 1. 降低更新频率
```yaml
update_rate: 5.0  # 从 10Hz 降到 5Hz
```

### 2. 简化预测
```yaml
enable_prediction: false  # 禁用预测
```

### 3. 减少路径点
```yaml
path_resolution: 0.5  # 增大路径点间距
```

## 故障排查

### 追踪抖动
1. 增加 `goal_tolerance`
2. 启用 `path_smoothing`
3. 调整 `update_rate`

### 丢失目标
1. 增加 `max_distance`
2. 延长 `prediction_time`
3. 降低 `update_rate`

### 碰撞风险
1. 增大 `min_distance`
2. 启用 `enable_safety_brake`
3. 增大 `obstacle_check_distance`

### 响应延迟
1. 提高 `update_rate`
2. 减少 `smoothing_window`
3. 禁用路径平滑

## 安全机制

### 碰撞预警
```python
def check_collision_risk(robot_pos, target_pos, obstacles):
    """检查碰撞风险"""
    # 计算到目标的路径
    path = compute_path(robot_pos, target_pos)
    
    # 检查路径上的障碍物
    for point in path:
        if is_near_obstacle(point, obstacles, safety_margin):
            return True  # 有碰撞风险
    
    return False
```

### 紧急停止
```python
def emergency_brake():
    """紧急刹车"""
    # 发送零速度命令
    cmd_vel = Twist()
    cmd_vel.linear.x = 0.0
    cmd_vel.angular.z = 0.0
    
    velocity_publisher.publish(cmd_vel)
```

## 集成示例

### 与导航系统集成
```python
# 追踪规划器输出目标 → Nav2 执行导航
tracking_goal = tracking_planner.compute_goal(target)
nav2_client.send_goal(tracking_goal)
```

### 与视觉追踪集成
```python
# DeepSORT 输出 → 追踪规划器
tracks = deepsort.get_tracks()
selected_track = select_target(tracks)
tracking_planner.set_target(selected_track)
```

## 参考资源
- [Nav2 动态目标](https://navigation.ros.org/tutorials/docs/using_collision_monitor.html)
- [追踪控制算法](https://www.ri.cmu.edu/pub_files/2013/6/tracking_control.pdf)
- [预测控制](https://en.wikipedia.org/wiki/Model_predictive_control)
