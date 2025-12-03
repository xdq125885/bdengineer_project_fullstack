"""
内容质量指标 - 评估测试用例的内容质量
"""

from typing import Dict, List
import re
import logging

logger = logging.getLogger(__name__)


class QualityMetric:
    """
    评估测试用例的内容质量
    
    质量维度：
    - 清晰度：用例描述是否清晰明确
    - 完整性：用例信息是否完整
    - 可执行性：用例是否可以被执行
    - 独立性：用例是否相对独立
    """
    
    def __init__(self):
        """初始化质量指标"""
        pass
    
    def check_clarity(self, text: str) -> float:
        """
        检查文本的清晰度
        
        Args:
            text: 文本内容
            
        Returns:
            清晰度分数 (0-1)
        """
        if not text:
            return 0.0
        
        score = 0.0
        
        # 检查是否有模糊词汇
        vague_words = ['可能', '也许', '似乎', '大概', '大约', '左右', '等等', '之类']
        vague_count = sum(1 for word in vague_words if word in text)
        
        # 检查是否有具体的操作动词
        action_verbs = ['点击', '输入', '选择', '勾选', '取消', '打开', '关闭', '提交', '确认', '删除']
        action_count = sum(1 for verb in action_verbs if verb in text)
        
        # 检查是否有具体的预期结果
        result_keywords = ['显示', '出现', '成功', '失败', '错误', '提示', '返回', '跳转']
        result_count = sum(1 for keyword in result_keywords if keyword in text)
        
        # 模糊词汇越少越好
        vague_penalty = min(vague_count * 0.1, 0.3)
        
        # 具体动词越多越好
        action_bonus = min(action_count * 0.05, 0.3)
        
        # 结果关键词越多越好
        result_bonus = min(result_count * 0.05, 0.2)
        
        score = 0.5 - vague_penalty + action_bonus + result_bonus
        
        return max(0.0, min(1.0, score))
    
    def check_completeness(self, structure: Dict[str, str]) -> float:
        """
        检查用例的完整性
        
        Args:
            structure: 用例结构字典
            
        Returns:
            完整性分数 (0-1)
        """
        score = 0.0
        
        # 各部分文本与长度
        title_text = structure.get("title", "").strip()
        precondition_text = structure.get("precondition", "").strip()
        steps_text = structure.get("steps", "").strip()
        expected_text = structure.get("expected_result", "").strip()
        
        title_len = len(title_text)
        precondition_len = len(precondition_text)
        steps_len = len(steps_text)
        expected_result_len = len(expected_text)
        
        # 标题：10-100字符为佳
        if 10 <= title_len <= 100:
            score += 0.15
        elif title_len > 0:
            score += 0.08
        
        # 前置条件：20字符以上为佳
        if precondition_len >= 20:
            score += 0.2
        elif precondition_len > 0:
            score += 0.1
        
        # 操作步骤：50字符以上，且有多个步骤为佳
        step_count = len(re.findall(r"(^\s*\d+\.|步骤\d+|^-\s+)", steps_text, re.MULTILINE))
        if steps_len >= 50 and step_count >= 2:
            score += 0.35
        elif steps_len >= 30:
            score += 0.2
        elif steps_len > 0:
            score += 0.1
        
        # 预期结果：20字符以上为佳
        if expected_result_len >= 20:
            score += 0.3
        elif expected_result_len > 0:
            score += 0.15
        
        return max(0.0, min(1.0, score))
    
    def check_executability(self, test_case: str) -> float:
        """
        检查用例的可执行性
        
        Args:
            test_case: 测试用例文本
            
        Returns:
            可执行性分数 (0-1)
        """
        score = 0.5
        
        # 检查是否有明确的操作步骤
        if re.search(r"\d+\.|步骤\d+|^-", test_case, re.MULTILINE):
            score += 0.2
        
        # 检查是否有明确的预期结果
        if re.search(r"预期|期望|应该|应当|会", test_case):
            score += 0.2
        
        # 检查是否有具体的输入数据
        if re.search(r"输入|填写|输入框|文本框", test_case):
            score += 0.1
        
        return max(0.0, min(1.0, score))
    
    def check_independence(self, test_case: str, other_cases: List[str]) -> float:
        """
        检查用例的独立性
        
        Args:
            test_case: 测试用例文本
            other_cases: 其他测试用例列表
            
        Returns:
            独立性分数 (0-1)
        """
        if not other_cases:
            return 1.0
        
        # 计算与其他用例的相似度（Jaccard）
        case_words = set(re.findall(r"\w+", test_case))
        
        similarity_scores = []
        for other_case in other_cases:
            other_words = set(re.findall(r"\w+", other_case))
            
            if not case_words or not other_words:
                similarity_scores.append(0.0)
                continue
            
            intersection = len(case_words & other_words)
            union = len(case_words | other_words)
            
            similarity = intersection / union if union > 0 else 0.0
            similarity_scores.append(similarity)
        
        avg_similarity = sum(similarity_scores) / len(similarity_scores) if similarity_scores else 0.0
        independence_score = 1.0 - avg_similarity
        
        return max(0.0, min(1.0, independence_score))
    
    def check_specificity(self, test_case: str) -> float:
        """
        检查用例的具体性
        
        Args:
            test_case: 测试用例文本
            
        Returns:
            具体性分数 (0-1)
        """
        score = 0.0
        
        # 检查是否有具体的UI元素
        ui_elements = ['按钮', '输入框', '下拉框', '复选框', '单选框', '文本框', '链接', '菜单']
        ui_count = sum(1 for elem in ui_elements if elem in test_case)
        score += min(ui_count * 0.1, 0.3)
        
        # 检查是否有具体的数据值
        if re.search(r"[0-9]{1,}|\"[^\"]*\"|'[^']*'", test_case):
            score += 0.3
        
        # 检查是否有具体的操作序列
        if re.search(r"\d+\.|步骤\d+", test_case):
            score += 0.2
        
        # 检查是否有具体的验证点
        if re.search(r"验证|检查|确认|查看", test_case):
            score += 0.2
        
        return max(0.0, min(1.0, score))
    
    def evaluate(self, test_case: str, structure: Dict[str, str] = None, 
                other_cases: List[str] = None) -> Dict:
        """
        完整的质量评估
        
        Args:
            test_case: 测试用例文本
            structure: 用例结构字典（如果为None则使用空结构或外部传入的结构）
            other_cases: 其他测试用例列表
            
        Returns:
            包含详细质量信息的字典
        """
        if structure is None:
            structure = {
                "title": "",
                "precondition": "",
                "steps": "",
                "expected_result": "",
            }
        
        if other_cases is None:
            other_cases = []
        
        clarity_score = self.check_clarity(test_case)
        completeness_score = self.check_completeness(structure)
        executability_score = self.check_executability(test_case)
        independence_score = self.check_independence(test_case, other_cases)
        specificity_score = self.check_specificity(test_case)
        
        # 综合质量分数
        overall_quality = (
            clarity_score * 0.2 +
            completeness_score * 0.25 +
            executability_score * 0.2 +
            independence_score * 0.15 +
            specificity_score * 0.2
        )
        
        return {
            "clarity_score": clarity_score,
            "completeness_score": completeness_score,
            "executability_score": executability_score,
            "independence_score": independence_score,
            "specificity_score": specificity_score,
            "overall_quality": overall_quality,
            "quality_level": self._get_quality_level(overall_quality)
        }
    
    @staticmethod
    def _get_quality_level(score: float) -> str:
        """
        根据分数判断质量等级
        
        Args:
            score: 质量分数
            
        Returns:
            质量等级
        """
        if score >= 0.85:
            return "优秀"
        elif score >= 0.7:
            return "良好"
        elif score >= 0.5:
            return "中等"
        else:
            return "需改进"
