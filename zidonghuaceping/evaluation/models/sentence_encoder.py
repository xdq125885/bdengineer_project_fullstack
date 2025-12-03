"""
句子编码器 - 使用PyTorch和sentence-transformers进行文本编码
"""

import logging
from typing import List, Union

import numpy as np
import torch
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


def _resolve_device(device_cfg: str) -> str:
    """根据配置解析实际设备字符串。
    - "cuda": 如本机 PyTorch 未启用 CUDA，则自动回退到 cpu
    - "cpu": 强制使用 cpu
    - "auto": 优先 cuda（当且仅当 torch.cuda.is_available 为 True 且编译支持 CUDA），否则 cpu
    """
    try:
        if device_cfg == "cpu":
            return "cpu"
        if device_cfg == "cuda":
            # 如果 CUDA 不可用或 PyTorch 未编译 CUDA，回退到 CPU
            if not torch.cuda.is_available() or torch.version.cuda is None:
                logger.warning("配置为 cuda，但当前 PyTorch 未启用/未编译 CUDA，自动回退到 cpu")
                return "cpu"
            return "cuda"
        # auto 分支
        if torch.cuda.is_available() and torch.version.cuda is not None:
            return "cuda"
        return "cpu"
    except Exception:
        # 任何异常安全回退到 CPU
        return "cpu"


class SentenceEncoder:
    """
    使用预训练模型对句子进行编码
    支持中文和多语言文本
    """

    def __init__(
        self,
        model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        device: str = "auto",
    ):
        """
        初始化编码器

        Args:
            model_name: 预训练模型名称或本地模型目录
            device: 计算设备 ("auto" | "cuda" | "cpu")
        """
        # 解析设备
        resolved = _resolve_device(device)
        self.device = resolved
        self.model_name = model_name

        # 加载模型（若 cuda 失败则自动回退 cpu 再试一次）
        try:
            self.model = SentenceTransformer(model_name, device=resolved)
            logger.info(f"成功加载SentenceTransformer模型: {model_name} (device={resolved})")
        except Exception as e:
            # 若目标为 cuda 时失败，则回退到 cpu 再试
            if resolved == "cuda":
                logger.warning(f"CUDA 加载失败，回退到 CPU 重新加载。错误: {e}")
                try:
                    self.device = "cpu"
                    self.model = SentenceTransformer(model_name, device="cpu")
                    logger.info(f"成功在 CPU 上加载模型: {model_name}")
                except Exception as e2:
                    logger.error(f"加载模型失败(回退到 CPU 仍失败): {e2}")
                    raise
            else:
                logger.error(f"加载模型失败: {e}")
                raise

    def encode(
        self,
        texts: Union[str, List[str]],
        normalize_embeddings: bool = True,
        batch_size: int = 32,
    ) -> np.ndarray:
        """
        对文本进行编码

        Args:
            texts: 单个文本或文本列表
            normalize_embeddings: 是否对嵌入向量进行归一化
            batch_size: 批处理大小

        Returns:
            编码后的向量 (np.ndarray)
        """
        if isinstance(texts, str):
            texts = [texts]

        try:
            embeddings = self.model.encode(
                texts,
                normalize_embeddings=normalize_embeddings,
                batch_size=batch_size,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
            return embeddings
        except Exception as e:
            logger.error(f"编码文本失败: {e}")
            raise

    def encode_batch(
        self,
        texts_list: List[List[str]],
        normalize_embeddings: bool = True,
        batch_size: int = 32,
    ) -> List[np.ndarray]:
        """
        批量编码多组文本

        Args:
            texts_list: 文本列表的列表
            normalize_embeddings: 是否对嵌入向量进行归一化
            batch_size: 批处理大小

        Returns:
            编码后的向量列表
        """
        results = []
        for texts in texts_list:
            embeddings = self.encode(texts, normalize_embeddings, batch_size)
            results.append(embeddings)
        return results

    def get_embedding_dim(self) -> int:
        """获取嵌入向量维度"""
        return self.model.get_sentence_embedding_dimension()

    def to(self, device: str):
        """将模型移动到指定设备（若不可用自动回退）"""
        target = _resolve_device(device)
        if target != device:
            logger.warning(f"请求设备 {device} 不可用，已回退为 {target}")
        self.device = target
        try:
            self.model.to(target)
            logger.info(f"模型已移动到设备: {target}")
        except Exception as e:
            if target == "cuda":
                logger.warning(f"移动到 CUDA 失败，回退到 CPU。错误: {e}")
                self.device = "cpu"
                self.model.to("cpu")
            else:
                raise
