"""
相似度模型 - 计算文本之间的语义相似度
"""

import numpy as np
from typing import List, Tuple
from scipy.spatial.distance import cosine
from sklearn.metrics.pairwise import cosine_similarity
import logging

logger = logging.getLogger(__name__)


class SimilarityModel:
    """
    计算文本相似度的模型
    支持多种相似度计算方法
    """
    
    def __init__(self, encoder):
        """
        初始化相似度模型
        
        Args:
            encoder: 句子编码器实例
        """
        self.encoder = encoder
    
    def cosine_similarity(self, embedding1: np.ndarray, 
                         embedding2: np.ndarray) -> float:
        """
        计算两个向量的余弦相似度
        
        Args:
            embedding1: 第一个嵌入向量
            embedding2: 第二个嵌入向量
            
        Returns:
            相似度分数 (0-1)
        """
        if embedding1.ndim == 1:
            embedding1 = embedding1.reshape(1, -1)
        if embedding2.ndim == 1:
            embedding2 = embedding2.reshape(1, -1)
        
        similarity = cosine_similarity(embedding1, embedding2)[0][0]
        return float(similarity)
    
    def batch_similarity(self, embeddings1: np.ndarray, 
                        embeddings2: np.ndarray) -> np.ndarray:
        """
        计算两组向量之间的相似度矩阵
        
        Args:
            embeddings1: 第一组嵌入向量 (n, d)
            embeddings2: 第二组嵌入向量 (m, d)
            
        Returns:
            相似度矩阵 (n, m)
        """
        similarity_matrix = cosine_similarity(embeddings1, embeddings2)
        return similarity_matrix
    
    def text_similarity(self, text1: str, text2: str) -> float:
        """
        计算两个文本的相似度
        
        Args:
            text1: 第一个文本
            text2: 第二个文本
            
        Returns:
            相似度分数 (0-1)
        """
        try:
            embedding1 = self.encoder.encode(text1)
            embedding2 = self.encoder.encode(text2)
            similarity = self.cosine_similarity(embedding1, embedding2)
            return similarity
        except Exception as e:
            logger.error(f"计算文本相似度失败: {e}")
            return 0.0
    
    def find_most_similar(self, query_embedding: np.ndarray, 
                         candidates_embeddings: np.ndarray,
                         top_k: int = 1) -> List[Tuple[int, float]]:
        """
        找到最相似的候选项
        
        Args:
            query_embedding: 查询嵌入向量
            candidates_embeddings: 候选嵌入向量集合
            top_k: 返回前k个最相似的结果
            
        Returns:
            [(索引, 相似度), ...] 的列表
        """
        if query_embedding.ndim == 1:
            query_embedding = query_embedding.reshape(1, -1)
        
        similarities = cosine_similarity(query_embedding, candidates_embeddings)[0]
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = [(int(idx), float(similarities[idx])) for idx in top_indices]
        return results
    
    def deduplicate_texts(self, texts: List[str], 
                         threshold: float = 0.85) -> List[Tuple[int, int, float]]:
        """
        检测重复的文本
        
        Args:
            texts: 文本列表
            threshold: 相似度阈值，超过此值认为重复
            
        Returns:
            [(索引1, 索引2, 相似度), ...] 的列表，表示重复的文本对
        """
        try:
            embeddings = self.encoder.encode(texts)
            similarity_matrix = self.batch_similarity(embeddings, embeddings)
            
            duplicates = []
            for i in range(len(texts)):
                for j in range(i + 1, len(texts)):
                    if similarity_matrix[i][j] >= threshold:
                        duplicates.append((i, j, float(similarity_matrix[i][j])))
            
            return duplicates
        except Exception as e:
            logger.error(f"检测重复文本失败: {e}")
            return []
    
    def semantic_clustering(self, texts: List[str], 
                           threshold: float = 0.7) -> List[List[int]]:
        """
        对文本进行语义聚类
        
        Args:
            texts: 文本列表
            threshold: 相似度阈值
            
        Returns:
            聚类结果，每个聚类是一个索引列表
        """
        try:
            embeddings = self.encoder.encode(texts)
            similarity_matrix = self.batch_similarity(embeddings, embeddings)
            
            clusters = []
            visited = set()
            
            for i in range(len(texts)):
                if i in visited:
                    continue
                
                cluster = [i]
                visited.add(i)
                
                for j in range(i + 1, len(texts)):
                    if j not in visited and similarity_matrix[i][j] >= threshold:
                        cluster.append(j)
                        visited.add(j)
                
                clusters.append(cluster)
            
            return clusters
        except Exception as e:
            logger.error(f"文本聚类失败: {e}")
            return []

