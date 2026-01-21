# 行为树 (Behavior Tree) 配置

## 功能说明
行为树用于编排复杂的导航任务和恢复行为，提供灵活的任务执行逻辑。

## 技术特点
- 🌳 **模块化**: 可复用的行为节点
- 🔄 **可扩展**: 自定义行为插件
- 🐛 **可调试**: Groot 可视化工具
- 🎯 **鲁棒性**: 自动恢复机制

## 行为树结构

### 基础导航行为树
```xml
<!-- navigate_to_pose_w_replanning.xml -->
<root main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <RecoveryNode number_of_retries="6" name="NavigateRecovery">
      <PipelineSequence name="NavigateWithReplanning">
        <!-- 计算路径 -->
        <RateController hz="1.0">
          <RecoveryNode number_of_retries="1" name="ComputePathToPose">
            <ComputePathToPose goal="{goal}" path="{path}" planner_id="GridBased"/>
            <ClearEntireCostmap name="ClearGlobalCostmap-Context" service_name="global_costmap/clear_entirely_global_costmap"/>
          </RecoveryNode>
        </RateController>
        
        <!-- 跟随路径 -->
        <RecoveryNode number_of_retries="1" name="FollowPath">
          <FollowPath path="{path}" controller_id="FollowPath"/>
          <ClearEntireCostmap name="ClearLocalCostmap-Context" service_name="local_costmap/clear_entirely_local_costmap"/>
        </RecoveryNode>
      </PipelineSequence>
      
      <!-- 恢复行为 -->
      <ReactiveFallback name="RecoveryFallback">
        <GoalUpdated/>
        <SequenceStar name="RecoveryActions">
          <ClearEntireCostmap name="ClearLocalCostmap-Subtree" service_name="local_costmap/clear_entirely_local_costmap"/>
          <ClearEntireCostmap name="ClearGlobalCostmap-Subtree" service_name="global_costmap/clear_entirely_global_costmap"/>
          <Spin spin_dist="1.57"/>
          <Wait wait_duration="5"/>
          <BackUp backup_dist="0.15" backup_speed="0.025"/>
        </SequenceStar>
      </ReactiveFallback>
    </RecoveryNode>
  </BehaviorTree>
</root>
```

### 目标追踪行为树
```xml
<!-- track_target.xml -->
<root main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <RecoveryNode number_of_retries="99" name="TrackTargetRecovery">
      <Sequence name="TrackSequence">
        <!-- 检查目标是否存在 -->
        <Condition ID="TargetDetected" target_topic="/targets/selected_target"/>
        
        <!-- 更新目标位置 -->
        <Action ID="UpdateTargetGoal" 
                target_topic="/targets/selected_target"
                goal="{goal}"/>
        
        <!-- 计算路径 -->
        <RateController hz="2.0">
          <ComputePathToPose goal="{goal}" path="{path}" planner_id="GridBased"/>
        </RateController>
        
        <!-- 跟随路径 (动态重规划) -->
        <FollowPath path="{path}" controller_id="FollowPath"/>
        
        <!-- 检查是否到达目标 -->
        <Condition ID="GoalReached" 
                   distance_threshold="0.5"/>
      </Sequence>
      
      <!-- 目标丢失恢复 -->
      <ReactiveFallback name="TargetLostRecovery">
        <Spin spin_dist="3.14"/>
        <Wait wait_duration="3"/>
      </ReactiveFallback>
    </RecoveryNode>
  </BehaviorTree>
</root>
```

### 多目标巡航行为树
```xml
<!-- patrol_multiple_goals.xml -->
<root main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <RecoveryNode number_of_retries="3" name="PatrolRecovery">
      <Repeat num_cycles="-1" name="PatrolLoop">
        <ForEach list="{waypoints}" item="{goal}">
          <Sequence name="VisitWaypoint">
            <!-- 导航到航点 -->
            <SubTree ID="NavigateToGoal" goal="{goal}"/>
            
            <!-- 到达后等待 -->
            <Wait wait_duration="2"/>
            
            <!-- 执行任务 (例如拍照、扫描) -->
            <Action ID="PerformTask"/>
          </Sequence>
        </ForEach>
      </Repeat>
      
      <!-- 巡航中断恢复 -->
      <Sequence name="PatrolRecovery">
        <Wait wait_duration="5"/>
        <Action ID="ResumePatrol"/>
      </Sequence>
    </RecoveryNode>
  </BehaviorTree>
  
  <BehaviorTree ID="NavigateToGoal">
    <RecoveryNode number_of_retries="2">
      <PipelineSequence>
        <ComputePathToPose goal="{goal}" path="{path}"/>
        <FollowPath path="{path}"/>
      </PipelineSequence>
      <ClearEntireCostmap service_name="global_costmap/clear_entirely_global_costmap"/>
    </RecoveryNode>
  </BehaviorTree>
</root>
```

## 自定义行为节点

### TargetDetected (条件节点)
```cpp
// target_detected_condition.cpp
#include "behaviortree_cpp_v3/condition_node.h"

class TargetDetectedCondition : public BT::ConditionNode
{
public:
  TargetDetectedCondition(const std::string& name, const BT::NodeConfiguration& config)
    : BT::ConditionNode(name, config) {}

  static BT::PortsList providedPorts()
  {
    return { BT::InputPort<std::string>("target_topic") };
  }

  BT::NodeStatus tick() override
  {
    // 检查是否有目标检测
    auto target_msg = getInput<Target3D>("target_topic");
    
    if (target_msg && target_msg->tracking_confidence > 0.5) {
      return BT::NodeStatus::SUCCESS;
    }
    
    return BT::NodeStatus::FAILURE;
  }
};
```

### UpdateTargetGoal (动作节点)
```cpp
// update_target_goal_action.cpp
#include "behaviortree_cpp_v3/action_node.h"

class UpdateTargetGoalAction : public BT::SyncActionNode
{
public:
  UpdateTargetGoalAction(const std::string& name, const BT::NodeConfiguration& config)
    : BT::SyncActionNode(name, config) {}

  static BT::PortsList providedPorts()
  {
    return {
      BT::InputPort<std::string>("target_topic"),
      BT::OutputPort<geometry_msgs::msg::PoseStamped>("goal")
    };
  }

  BT::NodeStatus tick() override
  {
    // 获取目标位置
    auto target = getCurrentTarget();
    
    // 转换为导航目标
    geometry_msgs::msg::PoseStamped goal;
    goal.header = target.header;
    goal.pose = target.pose_global.pose;
    
    // 输出目标
    setOutput("goal", goal);
    
    return BT::NodeStatus::SUCCESS;
  }
};
```

## 使用示例

### 加载自定义行为树
```bash
ros2 launch zhuo_rm_navigation navigation.launch.py \
    bt_xml_file:=/path/to/track_target.xml
```

### 使用 Groot 可视化
```bash
# 启动 Groot
groot

# 在 Nav2 配置中启用 Groot 监控
enable_groot_monitoring: True
groot_zmq_publisher_port: 1666
groot_zmq_server_port: 1667
```

### 切换行为树
```bash
# 通过服务切换
ros2 service call /behavior_tree/change_tree \
  nav2_msgs/srv/LoadBehaviorTree \
  "{filename: 'track_target.xml'}"
```

## 常用行为节点

### 导航相关
- `ComputePathToPose`: 计算路径
- `ComputePathThroughPoses`: 多点路径规划
- `FollowPath`: 跟随路径
- `Spin`: 原地旋转
- `BackUp`: 后退
- `Wait`: 等待

### 条件节点
- `GoalReached`: 目标到达检查
- `GoalUpdated`: 目标更新检查
- `IsStuck`: 卡住检查
- `IsPathValid`: 路径有效性检查
- `TransformAvailable`: TF 可用性检查

### 控制节点
- `RateController`: 频率控制
- `DistanceController`: 距离控制
- `SpeedController`: 速度控制
- `PipelineSequence`: 流水线序列
- `RecoveryNode`: 恢复节点

## 参数配置

### bt_navigator 参数
```yaml
bt_navigator:
  ros__parameters:
    # 行为树文件
    default_nav_to_pose_bt_xml: "navigate_to_pose_w_replanning.xml"
    default_nav_through_poses_bt_xml: "navigate_through_poses.xml"
    
    # 更新频率
    bt_loop_duration: 10  # ms
    
    # 超时设置
    default_server_timeout: 20  # seconds
    
    # Groot 监控
    enable_groot_monitoring: True
    groot_zmq_publisher_port: 1666
    groot_zmq_server_port: 1667
```

## 调试工具

### Groot
```bash
# 安装 Groot
sudo apt install ros-humble-groot

# 启动 Groot
groot

# 连接到运行中的行为树
# Host: localhost
# Port: 1666 (publisher) / 1667 (server)
```

### 日志输出
```cpp
// 在节点中添加日志
RCLCPP_INFO(get_logger(), "Executing action...");
RCLCPP_WARN(get_logger(), "Target lost!");
RCLCPP_ERROR(get_logger(), "Failed to compute path!");
```

## 故障排查

### 行为树不执行
1. 检查行为树文件路径
2. 验证 XML 语法
3. 查看日志输出

### 恢复行为循环
1. 检查 `number_of_retries`
2. 调整恢复行为顺序
3. 增加等待时间

### 节点卡住
1. 检查超时设置
2. 添加更多条件节点
3. 使用 Groot 调试

## 参考资源
- [Nav2 行为树](https://navigation.ros.org/behavior_trees/index.html)
- [BehaviorTree.CPP](https://www.behaviortree.dev/)
- [Groot](https://github.com/BehaviorTree/Groot)
- [示例行为树](https://github.com/ros-planning/navigation2/tree/main/nav2_bt_navigator/behavior_trees)
