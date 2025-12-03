"""
配置文件 - 自动化测评系统配置
"""

import os
from pathlib import Path

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent

# 模型配置
MODEL_CONFIG = {
    "encoder_model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    # 设备选择："auto" | "cpu" | "cuda"
    # - auto：自动检测，CUDA 可用则用 cuda，否则用 cpu
    # - cpu/cuda：强制指定
    "device": "auto",
    "batch_size": 32,
}

# 评测指标权重配置
METRIC_WEIGHTS = {
    "structure": 0.2,      # 结构完整性权重
    "coverage": 0.25,      # 覆盖率权重
    "quality": 0.25,       # 内容质量权重
    "similarity": 0.2,     # 语义相似度权重
    "uniqueness": 0.1,     # 去重性权重
}

# 结构完整性阈值
STRUCTURE_THRESHOLDS = {
    "title": 0.1,
    "precondition": 0.2,
    "steps": 0.4,
    "expected_result": 0.3,
}

# 相似度阈值
SIMILARITY_THRESHOLD = 0.6  # 认为相似的阈值（适当放宽，便于观测效果）

# 覆盖率计算配置
COVERAGE_CONFIG = {
    "min_coverage": 0.6,    # 最小覆盖率
    "target_coverage": 0.85, # 目标覆盖率
    "requirement_overlap_threshold": 0.3,  # 需求关键词重叠判定阈值（进一步放宽到0.3）
    "semantic_similarity_threshold": 0.55, # 语义相似度兜底阈值（启用相似度模型时生效）
}

# 日志配置
LOG_LEVEL = "INFO"
LOG_DIR = PROJECT_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)

# 数据配置
DATA_DIR = PROJECT_ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)

REFERENCE_CASES_DIR = DATA_DIR / "reference_cases"
REFERENCE_CASES_DIR.mkdir(exist_ok=True)

GENERATED_CASES_DIR = DATA_DIR / "generated_cases"
GENERATED_CASES_DIR.mkdir(exist_ok=True)

EVALUATION_RESULTS_DIR = DATA_DIR / "evaluation_results"
EVALUATION_RESULTS_DIR.mkdir(exist_ok=True)

# 可视化配置
VISUALIZATION_CONFIG = {
    "output_format": "html",  # 或 "png", "pdf"
    "theme": "light",
    "dpi": 300,
}
