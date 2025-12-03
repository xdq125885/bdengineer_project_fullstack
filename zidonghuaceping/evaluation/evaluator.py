"""
主评测器 - 整合所有评测指标进行综合评估
"""

import json
from typing import Dict, List
from datetime import datetime
import logging

from .models import SentenceEncoder, SimilarityModel
from .metrics import (
    StructureMetric,
    CoverageMetric,
    QualityMetric,
    SimilarityMetric,
    UniquenessMetric,
)
from .config import METRIC_WEIGHTS, MODEL_CONFIG

logger = logging.getLogger(__name__)


class Evaluator:
    """
    综合评测器
    
    功能：
    - 整合多个评测指标
    - 计算综合评分
    - 生成评测报告
    """
    
    def __init__(self, use_similarity_model: bool = True):
        """
        初始化评测器
        
        Args:
            use_similarity_model: 是否使用相似度模型
        """
        self.structure_metric = StructureMetric()
        self.coverage_metric = CoverageMetric()
        self.quality_metric = QualityMetric()
        self.uniqueness_metric = UniquenessMetric()
        
        self.similarity_metric = None
        if use_similarity_model:
            try:
                encoder = SentenceEncoder(
                    model_name=MODEL_CONFIG["encoder_model"],
                    device=MODEL_CONFIG["device"]
                )
                similarity_model = SimilarityModel(encoder)
                self.similarity_metric = SimilarityMetric(similarity_model)
                self.uniqueness_metric.similarity_model = similarity_model
                logger.info("相似度模型加载成功")
            except Exception as e:
                logger.warning(f"相似度模型加载失败: {e}，将使用基础评测")
                self.similarity_metric = None
    
    def evaluate_single_case(self, test_case: str, 
                            case_index: int = 0,
                            other_cases: List[str] = None) -> Dict:
        """
        评估单个测试用例
        
        Args:
            test_case: 测试用例文本
            case_index: 用例索引
            other_cases: 其他用例列表（用于计算独立性）
            
        Returns:
            单个用例的评估结果
        """
        if other_cases is None:
            other_cases = []
        
        # 提取结构
        structure = self.structure_metric.extract_structure(test_case)
        
        # 各指标评估
        structure_eval = self.structure_metric.evaluate(test_case)
        quality_eval = self.quality_metric.evaluate(test_case, structure, other_cases)
        
        return {
            "case_index": case_index,
            "case_text": test_case,
            "structure": structure,
            "structure_score": structure_eval["completeness_score"],
            "quality_score": quality_eval["overall_quality"],
            "quality_details": quality_eval,
            "structure_details": structure_eval,
        }
    
    def evaluate_batch(self, generated_cases: List[str],
                      reference_cases: List[str] = None,
                      prd_text: str = None) -> Dict:
        """
        批量评估测试用例
        
        Args:
            generated_cases: 生成的测试用例列表
            reference_cases: 参考用例列表（可选）
            prd_text: 产品需求文档文本（可选）
            
        Returns:
            批量评估结果
        """
        results = {
            "timestamp": datetime.now().isoformat(),
            "total_cases": len(generated_cases),
            "individual_evaluations": [],
            "aggregate_scores": {},
            "detailed_analysis": {},
        }
        
        # 评估每个用例
        for idx, case in enumerate(generated_cases):
            case_eval = self.evaluate_single_case(case, idx, generated_cases)
            results["individual_evaluations"].append(case_eval)
        
        # 计算聚合分数
        structure_scores = [e["structure_score"] for e in results["individual_evaluations"]]
        quality_scores = [e["quality_score"] for e in results["individual_evaluations"]]
        
        results["aggregate_scores"]["avg_structure_score"] = (
            sum(structure_scores) / len(structure_scores) if structure_scores else 0.0
        )
        results["aggregate_scores"]["avg_quality_score"] = (
            sum(quality_scores) / len(quality_scores) if quality_scores else 0.0
        )
        
        # 去重性评估
        uniqueness_eval = self.uniqueness_metric.evaluate(generated_cases)
        results["detailed_analysis"]["uniqueness"] = uniqueness_eval
        results["aggregate_scores"]["uniqueness_score"] = uniqueness_eval["diversity_score"]
        
        # 覆盖率评估（如果提供了PRD）
        if prd_text:
            coverage_eval = self.coverage_metric.evaluate(prd_text, generated_cases)
            results["detailed_analysis"]["coverage"] = coverage_eval
            results["aggregate_scores"]["coverage_score"] = coverage_eval["overall_coverage"]
        
        # 相似度评估（如果提供了参考用例）
        if reference_cases and self.similarity_metric:
            similarity_eval = self.similarity_metric.evaluate_against_reference(
                generated_cases, reference_cases
            )
            results["detailed_analysis"]["similarity"] = similarity_eval
            results["aggregate_scores"]["similarity_score"] = similarity_eval["coverage_rate"]
        
        # 计算综合分数
        results["overall_score"] = self._calculate_overall_score(results["aggregate_scores"])
        
        return results
    
    def compare_versions(self, version1_cases: List[str],
                        version2_cases: List[str],
                        reference_cases: List[str] = None,
                        prd_text: str = None) -> Dict:
        """
        比较两个版本的生成结果
        
        Args:
            version1_cases: 版本1的用例列表
            version2_cases: 版本2的用例列表
            reference_cases: 参考用例列表（可选）
            prd_text: 产品需求文档文本（可选）
            
        Returns:
            版本对比结果
        """
        eval1 = self.evaluate_batch(version1_cases, reference_cases, prd_text)
        eval2 = self.evaluate_batch(version2_cases, reference_cases, prd_text)
        
        comparison = {
            "version1": eval1,
            "version2": eval2,
            "improvements": {},
            "regressions": {},
            "overall_improvement": 0.0,
        }
        
        # 计算改进和回退
        for metric in eval1["aggregate_scores"]:
            if metric in eval2["aggregate_scores"]:
                score1 = eval1["aggregate_scores"][metric]
                score2 = eval2["aggregate_scores"][metric]
                improvement = score2 - score1
                
                if improvement > 0:
                    comparison["improvements"][metric] = improvement
                elif improvement < 0:
                    comparison["regressions"][metric] = abs(improvement)
        
        # 计算总体改进
        if eval1["overall_score"] > 0:
            comparison["overall_improvement"] = (
                (eval2["overall_score"] - eval1["overall_score"]) / eval1["overall_score"]
            )
        
        return comparison
    
    def _calculate_overall_score(self, aggregate_scores: Dict) -> float:
        """
        计算综合分数
        
        Args:
            aggregate_scores: 聚合分数字典
            
        Returns:
            综合分数
        """
        score_mapping = {
            "avg_structure_score": "structure",
            "avg_quality_score": "quality",
            "uniqueness_score": "uniqueness",
            "coverage_score": "coverage",
            "similarity_score": "similarity",
        }
        
        total_score = 0.0
        total_weight = 0.0
        
        for score_key, metric_name in score_mapping.items():
            if score_key in aggregate_scores and metric_name in METRIC_WEIGHTS:
                score = aggregate_scores[score_key]
                weight = METRIC_WEIGHTS[metric_name]
                total_score += score * weight
                total_weight += weight
        
        if total_weight > 0:
            return total_score / total_weight
        else:
            return 0.0
    
    def generate_report(self, evaluation_results: Dict, 
                       output_format: str = "dict") -> str:
        """
        生成评测报告
        
        Args:
            evaluation_results: 评测结果
            output_format: 输出格式 ("dict", "json", "text")
            
        Returns:
            格式化的报告
        """
        if output_format == "json":
            return json.dumps(evaluation_results, ensure_ascii=False, indent=2)
        
        elif output_format == "text":
            report = self._generate_text_report(evaluation_results)
            return report
        
        else:
            return evaluation_results
    
    def _generate_text_report(self, results: Dict) -> str:
        """
        生成文本格式的报告
        
        Args:
            results: 评测结果
            
        Returns:
            文本报告
        """
        report = []
        report.append("=" * 60)
        report.append("测试用例自动化评测报告")
        report.append("=" * 60)
        report.append(f"评测时间: {results.get('timestamp', 'N/A')}")
        report.append(f"总用例数: {results.get('total_cases', 0)}")
        report.append("")
        
        # 聚合分数
        report.append("【聚合分数】")
        report.append("-" * 40)
        for metric, score in results.get("aggregate_scores", {}).items():
            report.append(f"{metric}: {score:.4f}")
        report.append(f"综合分数: {results.get('overall_score', 0):.4f}")
        report.append("")
        
        # 详细分析
        if "detailed_analysis" in results:
            report.append("【详细分析】")
            report.append("-" * 40)
            
            if "uniqueness" in results["detailed_analysis"]:
                unique = results["detailed_analysis"]["uniqueness"]
                report.append(f"去重性: {unique.get('quality_level', 'N/A')}")
                report.append(f"  - 完全重复: {unique.get('exact_duplicate_count', 0)}")
                report.append(f"  - 高度相似: {unique.get('near_duplicate_count', 0)}")
                report.append(f"  - 多样性分数: {unique.get('diversity_score', 0):.4f}")
            
            if "coverage" in results["detailed_analysis"]:
                coverage = results["detailed_analysis"]["coverage"]
                report.append(f"覆盖率: {coverage.get('overall_coverage', 0):.4f}")
                report.append(f"  - 需求覆盖: {coverage['requirement_coverage'].get('coverage_rate', 0):.4f}")
                report.append(f"  - 功能覆盖: {coverage['feature_coverage'].get('feature_coverage_rate', 0):.4f}")
            
            if "similarity" in results["detailed_analysis"]:
                similarity = results["detailed_analysis"]["similarity"]
                report.append(f"相似度: {similarity.get('coverage_rate', 0):.4f}")
                report.append(f"  - 平均最大相似度: {similarity.get('mean_max_similarity', 0):.4f}")
        
        report.append("")
        report.append("=" * 60)
        
        return "\n".join(report)

