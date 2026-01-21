# YOLOv8 目标检测模块

## 功能说明
基于 YOLOv8 的实时目标检测，用于识别和定位目标物体。

## 技术特点
- 🚀 **实时检测**: 30-60 FPS @ 640×480
- 🎯 **高精度**: mAP 50-95 > 70%
- 📦 **轻量级**: YOLOv8n 模型 < 10MB
- 🔧 **易部署**: ONNX/TensorRT 加速

## 模型配置

### yolov8_detector.yaml
```yaml
yolo_detector:
  ros__parameters:
    # 模型配置
    model_path: "yolov8n.pt"      # n/s/m/l/x
    model_type: "yolov8"
    device: "cuda:0"              # cuda:0 或 cpu
    
    # 输入配置
    image_topic: "/p100r/color/image_raw"
    input_size: [640, 640]        # [width, height]
    
    # 输出配置
    detections_topic: "/yolo/detections"
    debug_image_topic: "/yolo/debug_image"
    
    # 检测参数
    confidence_threshold: 0.5     # 置信度阈值
    iou_threshold: 0.45           # NMS IoU 阈值
    max_det: 300                  # 最大检测数
    
    # 类别过滤
    enable_class_filter: true
    target_classes: [0]           # COCO: 0=person, 可添加其他类别
    
    # 性能优化
    half_precision: true          # FP16 推理
    enable_tensorrt: false        # TensorRT 加速
```

### 支持的目标类别 (COCO)
```python
COCO_CLASSES = {
    0: 'person',
    1: 'bicycle',
    2: 'car',
    16: 'dog',
    17: 'horse',
    # ... 80 个类别
}
```

## 自定义训练

### 1. 准备数据集
```yaml
# dataset.yaml
path: /path/to/dataset
train: images/train
val: images/val

names:
  0: target_robot
  1: obstacle
  2: ball
```

### 2. 训练模型
```python
from ultralytics import YOLO

# 加载预训练模型
model = YOLO('yolov8n.pt')

# 训练
model.train(
    data='dataset.yaml',
    epochs=100,
    imgsz=640,
    batch=16,
    device=0
)
```

### 3. 导出模型
```python
# 导出 ONNX
model.export(format='onnx')

# 导出 TensorRT
model.export(format='engine', half=True)
```

## ROS2 节点实现

### 检测消息定义
```msg
# Detection.msg
std_msgs/Header header
int32 class_id
string class_name
float32 confidence
float32 x_min
float32 y_min
float32 x_max
float32 y_max
float32 center_x
float32 center_y
```

### 检测数组
```msg
# DetectionArray.msg
std_msgs/Header header
Detection[] detections
```

## 使用示例

### 启动检测节点
```bash
# 使用默认模型
ros2 launch zhuo_rm_navigation yolo_detector.launch.py

# 使用自定义模型
ros2 launch zhuo_rm_navigation yolo_detector.launch.py \
    model_path:=/path/to/custom_model.pt
```

### 实时可视化
```bash
# RViz 查看
ros2 run rviz2 rviz2

# 图像查看
ros2 run rqt_image_view rqt_image_view \
    /yolo/debug_image
```

### 查看检测结果
```bash
# 监控检测频率
ros2 topic hz /yolo/detections

# 查看检测内容
ros2 topic echo /yolo/detections
```

## 话题接口

### 订阅话题
- `/p100r/color/image_raw`: 输入 RGB 图像 (sensor_msgs/Image)

### 发布话题
- `/yolo/detections`: 检测结果数组 (DetectionArray)
- `/yolo/debug_image`: 可视化图像 (sensor_msgs/Image)
- `/yolo/detection_count`: 检测数量 (std_msgs/Int32)

## 性能优化

### 1. 模型选择
```yaml
# 高速场景 (>60 FPS)
model_path: "yolov8n.pt"   # nano 版本

# 平衡场景 (30-45 FPS)
model_path: "yolov8s.pt"   # small 版本

# 高精度场景 (15-30 FPS)
model_path: "yolov8m.pt"   # medium 版本
```

### 2. GPU 加速
```yaml
# FP16 半精度
half_precision: true

# TensorRT 加速 (需先导出)
enable_tensorrt: true
model_path: "yolov8n.engine"
```

### 3. 输入分辨率
```yaml
# 低分辨率 (高速)
input_size: [320, 320]

# 标准分辨率 (平衡)
input_size: [640, 640]

# 高分辨率 (高精度)
input_size: [1280, 1280]
```

## 参数调优

### 高召回率 (检测更多目标)
```yaml
confidence_threshold: 0.3   # 降低置信度
iou_threshold: 0.3          # 降低 NMS 阈值
max_det: 500                # 增加最大检测数
```

### 高精确率 (减少误检)
```yaml
confidence_threshold: 0.7   # 提高置信度
iou_threshold: 0.5          # 提高 NMS 阈值
max_det: 100                # 限制检测数
```

### 远距离小目标
```yaml
input_size: [1280, 1280]    # 增大输入尺寸
confidence_threshold: 0.4   # 适度降低阈值
model_path: "yolov8l.pt"    # 使用大模型
```

## 依赖项

```bash
# YOLOv8
pip3 install ultralytics

# ONNX Runtime (可选)
pip3 install onnxruntime-gpu

# TensorRT (可选)
# 参考 NVIDIA TensorRT 安装文档

# ROS2 依赖
sudo apt install ros-humble-cv-bridge
sudo apt install ros-humble-vision-msgs
```

## 故障排查

### GPU 不可用
```bash
# 检查 CUDA
nvidia-smi

# 检查 PyTorch CUDA
python3 -c "import torch; print(torch.cuda.is_available())"
```

### 检测延迟高
1. 降低输入分辨率
2. 使用更小的模型
3. 启用 TensorRT
4. 检查 GPU 占用

### 误检率高
1. 增加置信度阈值
2. 使用更大的模型
3. 增加训练数据
4. 调整 NMS 参数

### 漏检率高
1. 降低置信度阈值
2. 增大输入分辨率
3. 使用数据增强训练
4. 检查光照条件

## 评估指标

### 检测性能
```bash
# 推理时间
ros2 topic echo /yolo/inference_time

# 检测频率
ros2 topic hz /yolo/detections
```

### 精度评估
使用验证集评估:
```python
from ultralytics import YOLO

model = YOLO('yolov8n.pt')
metrics = model.val(data='dataset.yaml')

print(f"mAP50: {metrics.box.map50}")
print(f"mAP50-95: {metrics.box.map}")
```

## 集成示例

### 与 DeepSORT 集成
```python
# 检测结果传递给追踪器
detections = yolo_detector.detect(image)
tracks = deepsort_tracker.update(detections)
```

### 与深度相机集成
```python
# 获取目标 3D 位置
depth_value = depth_image[detection.center_y, detection.center_x]
target_3d = pixel_to_3d(detection.center_x, detection.center_y, depth_value)
```

## 参考资源
- [YOLOv8 文档](https://docs.ultralytics.com/)
- [训练教程](https://docs.ultralytics.com/modes/train/)
- [模型库](https://github.com/ultralytics/ultralytics)
