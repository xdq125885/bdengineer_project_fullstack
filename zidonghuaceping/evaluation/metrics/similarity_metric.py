"""
语义相似度指标 - 评估生成用例与参考用例的相似度
"""

from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)


class SimilarityMetric:
    """
    评估生成的测试用例与参考用例的语义相似度
    
    用途：
    - 与参考用例比较，评估生成质量
    - 检测生成用例之间的重复
    - 指导模型改进
    """
    
    def __init__(self, similarity_model):
        """
        初始化相似度指标
        
        Args:
            similarity_model: 相似度模型实例
        """
        self.similarity_model = similarity_model
    
    def calculate_case_similarity(self, generated_case: str, 
                                 reference_case: str) -> float:
        """
        计算两个测试用例的相似度
        
        Args:
            generated_case: 生成的测试用例
            reference_case: 参考测试用例
            
        Returns:
            相似度分数 (0-1)
        """
        try:
            similarity = self.similarity_model.text_similarity(generated_case, reference_case)
            return similarity
        except Exception as e:
            logger.error(f"计算用例相似度失败: {e}")
            return 0.0
    
    def find_most_similar_reference(self, generated_case: str, 
                                   reference_cases: List[str],
                                   top_k: int = 1) -> List[Tuple[int, float, str]]:
        """
        找到最相似的参考用例
        
        Args:
            generated_case: 生成的测试用例
            reference_cases: 参考用例列表
            top_k: 返回前k个最相似的结果
            
        Returns:
            [(索引, 相似度, 参考用例文本), ...] 的列表
        """
        try:
            generated_embedding = self.similarity_model.encoder.encode(generated_case)
            reference_embeddings = self.similarity_model.encoder.encode(reference_cases)
            
            results = self.similarity_model.find_most_similar(
                generated_embedding, 
                reference_embeddings, 
                top_k
            )
            
            return [(idx, score, reference_cases[idx]) for idx, score in results]
        except Exception as e:
            logger.error(f"查找最相似参考用例失败: {e}")
            return []
    
    def calculate_batch_similarity(self, generated_cases: List[str], 
                                  reference_cases: List[str]) -> Dict:
        """
        批量计算生成用例与参考用例的相似度
        
        Args:
            generated_cases: 生成的测试用例列表
            reference_cases: 参考用例列表
            
        Returns:
            包含相似度矩阵和统计信息的字典
        """
        try:
            generated_embeddings = self.similarity_model.encoder.encode(generated_cases)
            reference_embeddings = self.similarity_model.encoder.encode(reference_cases)
            
            similarity_matrix = self.similarity_model.batch_similarity(
                generated_embeddings, 
                reference_embeddings
            )
            
            # 计算统计信息
            max_similarities = []
            avg_similarities = []
            
            for i in range(len(generated_cases)):
                similarities = similarity_matrix[i]
                max_similarities.append(float(max(similarities)))
                avg_similarities.append(float(sum(similarities) / len(similarities)))
            
            return {
                "similarity_matrix": similarity_matrix,
                "max_similarities": max_similarities,
                "avg_similarities": avg_similarities,
                "mean_max_similarity": sum(max_similarities) / len(max_similarities) if max_similarities else 0.0,
                "mean_avg_similarity": sum(avg_similarities) / len(avg_similarities) if avg_similarities else 0.0,
            }
        except Exception as e:
            logger.error(f"批量计算相似度失败: {e}")
            return {}
    
    def evaluate_against_reference(self, generated_cases: List[str], 
                                  reference_cases: List[str],
                                  similarity_threshold: float = 0.7) -> Dict:
        """
        根据参考用例评估生成用例
        
        Args:
            generated_cases: 生成的测试用例列表
            reference_cases: 参考用例列表
            similarity_threshold: 相似度阈值
            
        Returns:
            包含详细评估信息的字典
        """
        batch_similarity = self.calculate_batch_similarity(generated_cases, reference_cases)
        
        if not batch_similarity:
            return {
                "status": "error",
                "message": "计算相似度失败"
            }
        
        similarity_matrix = batch_similarity["similarity_matrix"]
        max_similarities = batch_similarity["max_similarities"]
        
        # 统计高相似度用例
        high_similarity_count = sum(1 for sim in max_similarities if sim >= similarity_threshold)
        
        # 统计低相似度用例
        low_similarity_count = sum(1 for sim in max_similarities if sim < 0.5)
        
        # 计算覆盖率（有相似参考用例的生成用例比例）
        coverage_rate = high_similarity_count / len(generated_cases) if generated_cases else 0.0
        
        return {
            "total_generated": len(generated_cases),
            "total_reference": len(reference_cases),
            "high_similarity_count": high_similarity_count,
            "low_similarity_count": low_similarity_count,
            "coverage_rate": coverage_rate,
            "mean_max_similarity": batch_similarity["mean_max_similarity"],
            "mean_avg_similarity": batch_similarity["mean_avg_similarity"],
            "similarity_distribution": self._analyze_similarity_distribution(max_similarities),
            "details": {
                "max_similarities": max_similarities,
                "avg_similarities": batch_similarity["avg_similarities"],
            }
        }
    
    def detect_duplicates_in_generated(self, generated_cases: List[str],
                                      threshold: float = 0.85) -> List[Tuple[int, int, float]]:
        """
        检测生成用例中的重复
        
        Args:
            generated_cases: 生成的测试用例列表
            threshold: 相似度阈值
            
        Returns:
            [(索引1, 索引2, 相似度), ...] 的列表
        """
        try:
            duplicates = self.similarity_model.deduplicate_texts(generated_cases, threshold)
            return duplicates
        except Exception as e:
            logger.error(f"检测重复用例失败: {e}")
            return []
    
    def cluster_generated_cases(self, generated_cases: List[str],
                               threshold: float = 0.7) -> Dict:
        """
        对生成的用例进行聚类
        
        Args:
            generated_cases: 生成的测试用例列表
            threshold: 相似度阈值
            
        Returns:
            聚类结果
        """
        try:
            clusters = self.similarity_model.semantic_clustering(generated_cases, threshold)
            
            cluster_info = []
            for cluster_id, indices in enumerate(clusters):
                cluster_info.append({
                    "cluster_id": cluster_id,
                    "size": len(indices),
                    "case_indices": indices,
                    "cases": [generated_cases[i] for i in indices]
                })
            
            return {
                "total_clusters": len(clusters),
                "cluster_info": cluster_info,
                "avg_cluster_size": sum(len(c) for c in clusters) / len(clusters) if clusters else 0,
            }
        except Exception as e:
            logger.error(f"用例聚类失败: {e}")
            return {}
    
    @staticmethod
    def _analyze_similarity_distribution(similarities: List[float]) -> Dict:
        """
        分析相似度分布
        
        Args:
            similarities: 相似度列表
            
        Returns:
            分布统计信息
        """
        if not similarities:
            return {}
        
        sorted_sims = sorted(similarities)
        
        return {
            "min": float(min(similarities)),
            "max": float(max(similarities)),
            "mean": float(sum(similarities) / len(similarities)),
            "median": float(sorted_sims[len(sorted_sims) // 2]),
            "q1": float(sorted_sims[len(sorted_sims) // 4]),
            "q3": float(sorted_sims[3 * len(sorted_sims) // 4]),
            "count": len(similarities),
        }

