"""
去重性指标 - 评估生成用例的多样性和去重效果
"""

from typing import Dict, List, Set, Tuple
import re
import logging

logger = logging.getLogger(__name__)


class UniquenessMetric:
    """
    评估生成测试用例的去重性和多样性
    
    评估维度：
    - 完全重复：内容完全相同
    - 高度相似：语义相同但表述不同
    - 多样性：用例覆盖的场景多样性
    """
    
    def __init__(self, similarity_model=None):
        """
        初始化去重性指标
        
        Args:
            similarity_model: 相似度模型实例（可选）
        """
        self.similarity_model = similarity_model
    
    def detect_exact_duplicates(self, test_cases: List[str]) -> List[Tuple[int, int]]:
        """
        检测完全重复的用例
        
        Args:
            test_cases: 测试用例列表
            
        Returns:
            [(索引1, 索引2), ...] 的列表，表示重复的用例对
        """
        duplicates = []
        
        for i in range(len(test_cases)):
            for j in range(i + 1, len(test_cases)):
                if test_cases[i].strip() == test_cases[j].strip():
                    duplicates.append((i, j))
        
        return duplicates
    
    def detect_near_duplicates(self, test_cases: List[str], 
                              threshold: float = 0.9) -> List[Tuple[int, int, float]]:
        """
        检测高度相似的用例（近似重复）
        
        Args:
            test_cases: 测试用例列表
            threshold: 相似度阈值
            
        Returns:
            [(索引1, 索引2, 相似度), ...] 的列表
        """
        if not self.similarity_model:
            logger.warning("未提供相似度模型，使用基于关键词的检测")
            return self._detect_near_duplicates_by_keywords(test_cases, threshold)
        
        try:
            near_duplicates = self.similarity_model.deduplicate_texts(test_cases, threshold)
            return near_duplicates
        except Exception as e:
            logger.error(f"检测近似重复失败: {e}")
            return []
    
    def _detect_near_duplicates_by_keywords(self, test_cases: List[str],
                                           threshold: float = 0.9) -> List[Tuple[int, int, float]]:
        """
        基于关键词的近似重复检测
        
        Args:
            test_cases: 测试用例列表
            threshold: 相似度阈值
            
        Returns:
            [(索引1, 索引2, 相似度), ...] 的列表
        """
        near_duplicates = []
        
        for i in range(len(test_cases)):
            keywords_i = self._extract_keywords(test_cases[i])
            
            for j in range(i + 1, len(test_cases)):
                keywords_j = self._extract_keywords(test_cases[j])
                
                # 计算Jaccard相似度
                if not keywords_i or not keywords_j:
                    continue
                
                intersection = len(keywords_i & keywords_j)
                union = len(keywords_i | keywords_j)
                
                if union > 0:
                    similarity = intersection / union
                    if similarity >= threshold:
                        near_duplicates.append((i, j, similarity))
        
        return near_duplicates
    
    def _extract_keywords(self, text: str) -> Set[str]:
        """
        从文本中提取关键词
        
        Args:
            text: 文本内容
            
        Returns:
            关键词集合
        """
        # 移除标点符号
        text = re.sub(r'[。！？，、；：""''（）【】\n\t]', ' ', text)
        
        # 分词
        words = text.split()
        
        # 过滤短词和虚词
        stopwords = {'的', '了', '和', '是', '在', '有', '用', '可以', '应该', '需要', '必须'}
        keywords = {w for w in words if len(w) > 1 and w not in stopwords}
        
        return keywords
    
    def calculate_diversity_score(self, test_cases: List[str]) -> float:
        """
        计算用例集合的多样性分数
        
        Args:
            test_cases: 测试用例列表
            
        Returns:
            多样性分数 (0-1)
        """
        if len(test_cases) <= 1:
            return 1.0
        
        # 检测重复
        exact_duplicates = self.detect_exact_duplicates(test_cases)
        near_duplicates = self.detect_near_duplicates(test_cases, threshold=0.85)
        
        # 计算重复率
        duplicate_pairs = len(exact_duplicates) + len(near_duplicates)
        max_possible_pairs = len(test_cases) * (len(test_cases) - 1) / 2
        
        if max_possible_pairs == 0:
            return 1.0
        
        duplicate_rate = duplicate_pairs / max_possible_pairs
        diversity_score = 1.0 - duplicate_rate
        
        return max(0.0, min(1.0, diversity_score))
    
    def calculate_scenario_diversity(self, test_cases: List[str]) -> Dict:
        """
        计算场景多样性
        
        Args:
            test_cases: 测试用例列表
            
        Returns:
            场景多样性评估
        """
        scenarios = {
            "正常场景": 0,
            "异常场景": 0,
            "边界场景": 0,
            "性能场景": 0,
            "安全场景": 0,
        }
        
        patterns = {
            "正常场景": r'正常|成功|正确|有效',
            "异常场景": r'异常|失败|错误|无效|非法',
            "边界场景": r'边界|极限|最大|最小|为空|空值|长度',
            "性能场景": r'性能|速度|响应|超时|延迟|并发',
            "安全场景": r'安全|权限|认证|授权|加密|隐私',
        }
        
        for test_case in test_cases:
            for scenario, pattern in patterns.items():
                if re.search(pattern, test_case, re.IGNORECASE):
                    scenarios[scenario] += 1
        
        # 计算多样性分数
        scenario_counts = [v for v in scenarios.values() if v > 0]
        covered_scenarios = len(scenario_counts)
        total_scenarios = len(scenarios)
        
        diversity_score = covered_scenarios / total_scenarios if total_scenarios > 0 else 0.0
        
        return {
            "scenarios": scenarios,
            "covered_scenarios": covered_scenarios,
            "total_scenarios": total_scenarios,
            "diversity_score": diversity_score,
        }
    
    def evaluate(self, test_cases: List[str]) -> Dict:
        """
        完整的去重性和多样性评估
        
        Args:
            test_cases: 测试用例列表
            
        Returns:
            包含详细评估信息的字典
        """
        exact_duplicates = self.detect_exact_duplicates(test_cases)
        near_duplicates = self.detect_near_duplicates(test_cases, threshold=0.85)
        
        diversity_score = self.calculate_diversity_score(test_cases)
        scenario_diversity = self.calculate_scenario_diversity(test_cases)
        
        # 计算去重率
        total_duplicates = len(exact_duplicates) + len(near_duplicates)
        max_possible_pairs = len(test_cases) * (len(test_cases) - 1) / 2
        deduplication_rate = 1.0 - (total_duplicates / max_possible_pairs if max_possible_pairs > 0 else 0)
        
        return {
            "total_cases": len(test_cases),
            "exact_duplicates": exact_duplicates,
            "exact_duplicate_count": len(exact_duplicates),
            "near_duplicates": near_duplicates,
            "near_duplicate_count": len(near_duplicates),
            "total_duplicate_pairs": total_duplicates,
            "deduplication_rate": deduplication_rate,
            "diversity_score": diversity_score,
            "scenario_diversity": scenario_diversity,
            "quality_level": self._get_quality_level(diversity_score, deduplication_rate)
        }
    
    @staticmethod
    def _get_quality_level(diversity_score: float, deduplication_rate: float) -> str:
        """
        根据分数判断去重性质量等级
        
        Args:
            diversity_score: 多样性分数
            deduplication_rate: 去重率
            
        Returns:
            质量等级
        """
        combined_score = (diversity_score + deduplication_rate) / 2
        
        if combined_score >= 0.9:
            return "优秀"
        elif combined_score >= 0.75:
            return "良好"
        elif combined_score >= 0.6:
            return "中等"
        else:
            return "需改进"

