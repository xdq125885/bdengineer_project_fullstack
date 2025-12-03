"""
结构完整性指标 - 评估测试用例的结构是否完整
"""

import re
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)


class StructureMetric:
    """
    评估测试用例的结构完整性
    
    标准测试用例格式：
    - 标题 (Title)
    - 前置条件 (Precondition)
    - 操作步骤 (Steps)
    - 预期结果 (Expected Result)
    """
    
    # 结构元素的关键词
    KEYWORDS = {
        "title": ["标题", "用例名称", "测试用例", "case name", "title"],
        "precondition": ["前置条件", "前提条件", "precondition", "前置", "prerequisite"],
        "steps": ["操作步骤", "步骤", "操作", "steps", "操作流程", "流程"],
        "expected_result": ["预期结果", "期望结果", "预期", "expected result", "预期输出", "结果"],
    }
    
    def __init__(self, weights: Dict[str, float] = None):
        """
        初始化结构完整性指标
        
        Args:
            weights: 各结构元素的权重
        """
        self.weights = weights or {
            "title": 0.1,
            "precondition": 0.2,
            "steps": 0.4,
            "expected_result": 0.3,
        }
    
    def extract_structure(self, test_case: str) -> Dict[str, str]:
        """
        从测试用例文本中提取结构元素
        
        Args:
            test_case: 测试用例文本
            
        Returns:
            包含各结构元素的字典
        """
        structure = {
            "title": "",
            "precondition": "",
            "steps": "",
            "expected_result": "",
        }
        
        lines = test_case.split('\n')
        current_section = None
        current_content = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 检查是否是新的结构元素
            section = self._detect_section(line)
            
            if section:
                # 保存前一个部分的内容
                if current_section:
                    structure[current_section] = '\n'.join(current_content).strip()
                
                current_section = section
                current_content = [line]
            else:
                if current_section:
                    current_content.append(line)
        
        # 保存最后一个部分
        if current_section:
            structure[current_section] = '\n'.join(current_content).strip()
        
        return structure
    
    def _detect_section(self, line: str) -> str:
        """
        检测行是否是结构元素的开始
        
        Args:
            line: 文本行
            
        Returns:
            检测到的结构元素类型，如果没有则返回None
        """
        line_lower = line.lower()
        
        for section, keywords in self.KEYWORDS.items():
            for keyword in keywords:
                if keyword in line_lower:
                    return section
        
        return None
    
    def check_element_presence(self, structure: Dict[str, str]) -> Dict[str, bool]:
        """
        检查各结构元素是否存在
        
        Args:
            structure: 结构字典
            
        Returns:
            各元素是否存在的布尔值字典
        """
        presence = {}
        for element, content in structure.items():
            presence[element] = bool(content and len(content.strip()) > 0)
        
        return presence
    
    def check_element_quality(self, structure: Dict[str, str]) -> Dict[str, float]:
        """
        检查各结构元素的质量（基于长度和内容）
        
        Args:
            structure: 结构字典
            
        Returns:
            各元素的质量分数 (0-1)
        """
        quality = {}
        
        for element, content in structure.items():
            if not content:
                quality[element] = 0.0
            else:
                # 基于内容长度的启发式评分
                content_len = len(content.strip())
                
                if element == "title":
                    # 标题应该简洁，10-50个字符较好
                    if 10 <= content_len <= 50:
                        quality[element] = 1.0
                    elif 5 <= content_len < 10 or 50 < content_len <= 100:
                        quality[element] = 0.7
                    else:
                        quality[element] = 0.4
                
                elif element == "precondition":
                    # 前置条件应该有一定长度，至少20个字符
                    if content_len >= 20:
                        quality[element] = 1.0
                    elif content_len >= 10:
                        quality[element] = 0.6
                    else:
                        quality[element] = 0.3
                
                elif element == "steps":
                    # 操作步骤应该是最长的，至少50个字符
                    # 检查是否有步骤编号
                    step_count = len(re.findall(r'\d+\.|步骤\d+', content))
                    
                    if content_len >= 50 and step_count >= 2:
                        quality[element] = 1.0
                    elif content_len >= 30 and step_count >= 1:
                        quality[element] = 0.7
                    else:
                        quality[element] = 0.4
                
                elif element == "expected_result":
                    # 预期结果应该有一定长度
                    if content_len >= 20:
                        quality[element] = 1.0
                    elif content_len >= 10:
                        quality[element] = 0.6
                    else:
                        quality[element] = 0.3
        
        return quality
    
    def calculate_completeness(self, test_case: str) -> float:
        """
        计算测试用例的结构完整性分数
        
        Args:
            test_case: 测试用例文本
            
        Returns:
            完整性分数 (0-1)
        """
        structure = self.extract_structure(test_case)
        presence = self.check_element_presence(structure)
        quality = self.check_element_quality(structure)
        
        # 综合计算分数
        total_score = 0.0
        for element, weight in self.weights.items():
            element_score = (presence[element] * 0.5 + quality[element] * 0.5)
            total_score += element_score * weight
        
        return total_score
    
    def evaluate(self, test_case: str) -> Dict:
        """
        完整的结构评估
        
        Args:
            test_case: 测试用例文本
            
        Returns:
            包含详细评估信息的字典
        """
        structure = self.extract_structure(test_case)
        presence = self.check_element_presence(structure)
        quality = self.check_element_quality(structure)
        completeness = self.calculate_completeness(test_case)
        
        return {
            "structure": structure,
            "presence": presence,
            "quality": quality,
            "completeness_score": completeness,
            "details": {
                "has_title": presence["title"],
                "has_precondition": presence["precondition"],
                "has_steps": presence["steps"],
                "has_expected_result": presence["expected_result"],
            }
        }

