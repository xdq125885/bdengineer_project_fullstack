"""
工具函数 - 辅助功能和通用工具
"""

import os
import json
import logging
from typing import List, Dict, Any
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)


class FileUtils:
    """文件操作工具"""
    
    @staticmethod
    def read_json(file_path: str) -> Dict:
        """
        读取JSON文件
        
        Args:
            file_path: 文件路径
            
        Returns:
            JSON数据
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"读取JSON文件失败: {e}")
            return {}
    
    @staticmethod
    def write_json(data: Dict, file_path: str) -> bool:
        """
        写入JSON文件
        
        Args:
            data: 数据
            file_path: 文件路径
            
        Returns:
            是否成功
        """
        try:
            Path(file_path).parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"写入JSON文件失败: {e}")
            return False
    
    @staticmethod
    def read_text(file_path: str) -> str:
        """
        读取文本文件
        
        Args:
            file_path: 文件路径
            
        Returns:
            文本内容
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"读取文本文件失败: {e}")
            return ""
    
    @staticmethod
    def write_text(content: str, file_path: str) -> bool:
        """
        写入文本文件
        
        Args:
            content: 文本内容
            file_path: 文件路径
            
        Returns:
            是否成功
        """
        try:
            Path(file_path).parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            logger.error(f"写入文本文件失败: {e}")
            return False
    
    @staticmethod
    def list_files(directory: str, extension: str = None) -> List[str]:
        """
        列出目录中的文件
        
        Args:
            directory: 目录路径
            extension: 文件扩展名（可选）
            
        Returns:
            文件路径列表
        """
        try:
            files = []
            for file_path in Path(directory).glob('*'):
                if file_path.is_file():
                    if extension is None or file_path.suffix == extension:
                        files.append(str(file_path))
            return files
        except Exception as e:
            logger.error(f"列出文件失败: {e}")
            return []


class TestCaseParser:
    """测试用例解析工具"""
    
    @staticmethod
    def parse_markdown_cases(markdown_text: str) -> List[Dict]:
        """
        从Markdown文本中解析测试用例
        
        Args:
            markdown_text: Markdown文本
            
        Returns:
            测试用例列表
        """
        cases = []
        current_case = None
        current_section = None
        
        lines = markdown_text.split('\n')
        
        for line in lines:
            # 检测标题（# 用例名称）
            if line.startswith('# '):
                if current_case:
                    cases.append(current_case)
                current_case = {
                    "title": line[2:].strip(),
                    "precondition": "",
                    "steps": "",
                    "expected_result": "",
                }
                current_section = None
            
            # 检测小标题（## 前置条件等）
            elif line.startswith('## '):
                section_title = line[3:].strip()
                if "前置" in section_title or "前提" in section_title:
                    current_section = "precondition"
                elif "步骤" in section_title or "操作" in section_title:
                    current_section = "steps"
                elif "预期" in section_title or "期望" in section_title:
                    current_section = "expected_result"
            
            # 添加内容到当前部分
            elif current_case and current_section and line.strip():
                current_case[current_section] += line + "\n"
        
        # 添加最后一个用例
        if current_case:
            cases.append(current_case)
        
        return cases
    
    @staticmethod
    def format_case_as_markdown(case: Dict) -> str:
        """
        将测试用例格式化为Markdown
        
        Args:
            case: 测试用例字典
            
        Returns:
            Markdown格式的用例
        """
        markdown = []
        
        if case.get("title"):
            markdown.append(f"# {case['title']}")
            markdown.append("")
        
        if case.get("precondition"):
            markdown.append("## 前置条件")
            markdown.append(case["precondition"])
            markdown.append("")
        
        if case.get("steps"):
            markdown.append("## 操作步骤")
            markdown.append(case["steps"])
            markdown.append("")
        
        if case.get("expected_result"):
            markdown.append("## 预期结果")
            markdown.append(case["expected_result"])
            markdown.append("")
        
        return "\n".join(markdown)


class Logger:
    """日志工具"""
    
    @staticmethod
    def setup_logger(name: str, log_file: str = None, 
                    level: str = "INFO") -> logging.Logger:
        """
        设置日志记录器
        
        Args:
            name: 记录器名称
            log_file: 日志文件路径（可选）
            level: 日志级别
            
        Returns:
            日志记录器
        """
        logger = logging.getLogger(name)
        logger.setLevel(getattr(logging, level))
        
        # 控制台处理器
        console_handler = logging.StreamHandler()
        console_handler.setLevel(getattr(logging, level))
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
        
        # 文件处理器
        if log_file:
            Path(log_file).parent.mkdir(parents=True, exist_ok=True)
            file_handler = logging.FileHandler(log_file, encoding='utf-8')
            file_handler.setLevel(getattr(logging, level))
            file_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
        
        return logger


class StatisticsUtils:
    """统计工具"""
    
    @staticmethod
    def calculate_statistics(values: List[float]) -> Dict[str, float]:
        """
        计算统计信息
        
        Args:
            values: 数值列表
            
        Returns:
            统计信息字典
        """
        if not values:
            return {}
        
        sorted_values = sorted(values)
        n = len(values)
        
        # 计算平均值
        mean = sum(values) / n
        
        # 计算中位数
        if n % 2 == 0:
            median = (sorted_values[n // 2 - 1] + sorted_values[n // 2]) / 2
        else:
            median = sorted_values[n // 2]
        
        # 计算标准差
        variance = sum((x - mean) ** 2 for x in values) / n
        std_dev = variance ** 0.5
        
        # 计算四分位数
        q1_idx = n // 4
        q3_idx = 3 * n // 4
        q1 = sorted_values[q1_idx]
        q3 = sorted_values[q3_idx]
        
        return {
            "count": n,
            "min": min(values),
            "max": max(values),
            "mean": mean,
            "median": median,
            "std_dev": std_dev,
            "q1": q1,
            "q3": q3,
            "iqr": q3 - q1,
        }
    
    @staticmethod
    def compare_distributions(values1: List[float], 
                             values2: List[float]) -> Dict:
        """
        比较两个分布
        
        Args:
            values1: 第一个数值列表
            values2: 第二个数值列表
            
        Returns:
            比较结果
        """
        stats1 = StatisticsUtils.calculate_statistics(values1)
        stats2 = StatisticsUtils.calculate_statistics(values2)
        
        return {
            "distribution1": stats1,
            "distribution2": stats2,
            "mean_difference": stats2.get("mean", 0) - stats1.get("mean", 0),
            "median_difference": stats2.get("median", 0) - stats1.get("median", 0),
        }


class ReportGenerator:
    """报告生成工具"""
    
    @staticmethod
    def generate_summary_report(evaluation_results: Dict) -> str:
        """
        生成摘要报告
        
        Args:
            evaluation_results: 评测结果
            
        Returns:
            摘要报告文本
        """
        report = []
        report.append("=" * 70)
        report.append("测试用例自动化评测摘要报告")
        report.append("=" * 70)
        report.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # 基本信息
        report.append("【基本信息】")
        report.append(f"  总用例数: {evaluation_results.get('total_cases', 0)}")
        report.append("")
        
        # 综合分数
        report.append("【综合分数】")
        overall_score = evaluation_results.get('overall_score', 0)
        report.append(f"  综合分数: {overall_score:.4f}")
        
        if overall_score >= 0.85:
            report.append("  评级: ⭐⭐⭐⭐⭐ 优秀")
        elif overall_score >= 0.7:
            report.append("  评级: ⭐⭐⭐⭐ 良好")
        elif overall_score >= 0.5:
            report.append("  评级: ⭐⭐⭐ 中等")
        else:
            report.append("  评级: ⭐⭐ 需改进")
        report.append("")
        
        # 各指标分数
        report.append("【各指标分数】")
        for metric, score in evaluation_results.get('aggregate_scores', {}).items():
            report.append(f"  {metric}: {score:.4f}")
        report.append("")
        
        # 建议
        report.append("【改进建议】")
        scores = evaluation_results.get('aggregate_scores', {})
        
        min_score = min(scores.values()) if scores else 0
        min_metric = [k for k, v in scores.items() if v == min_score][0] if scores else ""
        
        if min_score < 0.7:
            report.append(f"  1. 重点改进: {min_metric}")
        
        if scores.get('uniqueness_score', 1) < 0.8:
            report.append("  2. 检查用例重复情况，增加多样性")
        
        if scores.get('coverage_score', 1) < 0.8:
            report.append("  3. 扩大需求覆盖范围")
        
        report.append("")
        report.append("=" * 70)
        
        return "\n".join(report)

