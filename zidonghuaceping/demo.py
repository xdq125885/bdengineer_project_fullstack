"""
演示脚本 - 展示如何使用自动化测评系统
基于用户登录的PRD、AI生成用例、人工编写用例进行评测
"""

import json
import logging
from pathlib import Path

from evaluation.evaluator import Evaluator
from evaluation.visualizer import Visualizer
from evaluation.utils import FileUtils, Logger, ReportGenerator, TestCaseParser
from evaluation.config import EVALUATION_RESULTS_DIR, LOG_DIR

# 设置日志
logger = Logger.setup_logger(
    "demo",
    log_file=str(LOG_DIR / "demo.log"),
    level="INFO"
)


def load_json_cases(json_file: str) -> list:
    """
    从JSON文件加载测试用例
    
    Args:
        json_file: JSON文件路径
        
    Returns:
        测试用例列表（转换为文本格式）
    """
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            cases = json.load(f)
        
        # 将JSON格式的用例转换为文本格式
        text_cases = []
        for case in cases:
            case_text = format_case_from_json(case)
            text_cases.append(case_text)
        
        logger.info(f"从 {json_file} 加载了 {len(text_cases)} 个用例")
        return text_cases
    
    except Exception as e:
        logger.error(f"加载JSON文件失败: {e}")
        return []


def format_case_from_json(case: dict) -> str:
    """
    将JSON格式的用例转换为文本格式
    
    Args:
        case: JSON格式的用例字典
        
    Returns:
        文本格式的用例
    """
    lines = []
    
    # 标题
    if case.get("title"):
        lines.append(f"# {case['title']}")
        lines.append("")
    
    # 前置条件
    if case.get("preconditions"):
        lines.append("## 前置条件")
        preconditions = case["preconditions"]
        if isinstance(preconditions, list):
            for pre in preconditions:
                lines.append(f"- {pre}")
        else:
            lines.append(f"- {preconditions}")
        lines.append("")
    
    # 操作步骤
    if case.get("steps"):
        lines.append("## 操作步骤")
        steps = case["steps"]
        if isinstance(steps, list):
            for step in steps:
                lines.append(f"- {step}")
        else:
            lines.append(f"- {steps}")
        lines.append("")
    
    # 预期结果
    if case.get("expected"):
        lines.append("## 预期结果")
        expected = case["expected"]
        if isinstance(expected, list):
            for exp in expected:
                lines.append(f"- {exp}")
        else:
            lines.append(f"- {expected}")
        lines.append("")
    
    return "\n".join(lines)


def run_demo():
    """运行演示"""
    
    logger.info("=" * 80)
    logger.info("自动化测评系统演示 - 用户登录功能")
    logger.info("=" * 80)
    logger.info("")
    
    # 文件路径
    prd_file = "用户登录.md"
    ai_cases_file = "PRDAI1.json"
    human_cases_file = "prdrengong.json"
    output_dir = str(EVALUATION_RESULTS_DIR / "demo_results")
    
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # 1. 加载数据
    logger.info("【步骤1】加载数据")
    logger.info("-" * 80)
    
    # 读取PRD
    logger.info(f"读取PRD文件: {prd_file}")
    prd_text = FileUtils.read_text(prd_file)
    logger.info(f"PRD长度: {len(prd_text)} 字符")
    logger.info("")
    
    # 加载AI生成的用例
    logger.info(f"加载AI生成的用例: {ai_cases_file}")
    ai_cases = load_json_cases(ai_cases_file)
    logger.info(f"AI生成用例数: {len(ai_cases)}")
    logger.info("")
    
    # 加载人工编写的用例
    logger.info(f"加载人工编写的用例: {human_cases_file}")
    human_cases = load_json_cases(human_cases_file)
    logger.info(f"人工编写用例数: {len(human_cases)}")
    logger.info("")
    
    # 2. 初始化评测器
    logger.info("【步骤2】初始化评测器")
    logger.info("-" * 80)
    logger.info("初始化评测器（包括相似度模型）...")
    evaluator = Evaluator(use_similarity_model=True)
    logger.info("评测器初始化完成")
    logger.info("")
    
    # 3. 评测AI生成的用例
    logger.info("【步骤3】评测AI生成的用例")
    logger.info("-" * 80)
    logger.info("执行评测...")
    ai_eval_results = evaluator.evaluate_batch(
        ai_cases,
        reference_cases=human_cases,
        prd_text=prd_text
    )
    logger.info("AI用例评测完成")
    logger.info("")
    
    # 4. 评测人工编写的用例
    logger.info("【步骤4】评测人工编写的用例")
    logger.info("-" * 80)
    logger.info("执行评测...")
    human_eval_results = evaluator.evaluate_batch(
        human_cases,
        reference_cases=None,  # 人工用例作为参考，不需要对比
        prd_text=prd_text
    )
    logger.info("人工用例评测完成")
    logger.info("")
    
    # 5. 版本对比
    logger.info("【步骤5】版本对比分析")
    logger.info("-" * 80)
    logger.info("对比AI生成用例与人工编写用例...")
    comparison_results = evaluator.compare_versions(
        ai_cases,
        human_cases,
        reference_cases=None,
        prd_text=prd_text
    )
    logger.info("版本对比完成")
    logger.info("")
    
    # 6. 生成报告
    logger.info("【步骤6】生成报告")
    logger.info("-" * 80)
    
    # AI用例评测报告
    ai_report_file = Path(output_dir) / "ai_evaluation_report.json"
    FileUtils.write_json(ai_eval_results, str(ai_report_file))
    logger.info(f"✓ AI用例评测报告: {ai_report_file}")
    
    # 人工用例评测报告
    human_report_file = Path(output_dir) / "human_evaluation_report.json"
    FileUtils.write_json(human_eval_results, str(human_report_file))
    logger.info(f"✓ 人工用例评测报告: {human_report_file}")
    
    # 版本对比报告
    comparison_file = Path(output_dir) / "version_comparison.json"
    FileUtils.write_json(comparison_results, str(comparison_file))
    logger.info(f"✓ 版本对比报告: {comparison_file}")
    
    # 生成HTML报告
    visualizer = Visualizer(output_dir)
    
    ai_html_file = Path(output_dir) / "ai_evaluation_report.html"
    visualizer.export_results(ai_eval_results, str(ai_html_file), format="html")
    logger.info(f"✓ AI用例HTML报告: {ai_html_file}")
    
    human_html_file = Path(output_dir) / "human_evaluation_report.html"
    visualizer.export_results(human_eval_results, str(human_html_file), format="html")
    logger.info(f"✓ 人工用例HTML报告: {human_html_file}")
    
    logger.info("")
    
    # 7. 打印对比摘要
    logger.info("【步骤7】对比摘要")
    logger.info("-" * 80)
    
    print_comparison_summary(ai_eval_results, human_eval_results, comparison_results)
    
    logger.info("")
    logger.info("=" * 80)
    logger.info("演示完成！所有报告已生成")
    logger.info(f"输出目录: {output_dir}")
    logger.info("=" * 80)


def print_comparison_summary(ai_results: dict, human_results: dict, comparison: dict):
    """
    打印对比摘要
    
    Args:
        ai_results: AI用例评测结果
        human_results: 人工用例评测结果
        comparison: 版本对比结果
    """
    
    # AI用例分数
    ai_scores = ai_results.get("aggregate_scores", {})
    ai_overall = ai_results.get("overall_score", 0)
    
    # 人工用例分数
    human_scores = human_results.get("aggregate_scores", {})
    human_overall = human_results.get("overall_score", 0)
    
    logger.info("")
    logger.info("📊 【综合分数对比】")
    logger.info(f"  AI生成用例综合分数:    {ai_overall:.4f}")
    logger.info(f"  人工编写用例综合分数:  {human_overall:.4f}")
    logger.info(f"  差异:                 {abs(ai_overall - human_overall):.4f}")
    logger.info("")
    
    logger.info("📈 【各维度分数对比】")
    logger.info(f"{'指标':<20} {'AI生成':<15} {'人工编写':<15} {'差异':<15}")
    logger.info("-" * 65)
    
    metrics = [
        ("结构完整性", "avg_structure_score"),
        ("内容质量", "avg_quality_score"),
        ("去重性", "uniqueness_score"),
        ("覆盖率", "coverage_score"),
        ("相似度", "similarity_score"),
    ]
    
    for metric_name, metric_key in metrics:
        ai_score = ai_scores.get(metric_key, 0)
        human_score = human_scores.get(metric_key, 0)
        diff = ai_score - human_score
        
        logger.info(f"{metric_name:<20} {ai_score:<15.4f} {human_score:<15.4f} {diff:+.4f}")
    
    logger.info("")
    
    # 详细分析
    logger.info("🔍 【详细分析】")
    
    # 去重性分析
    if "uniqueness" in ai_results.get("detailed_analysis", {}):
        ai_unique = ai_results["detailed_analysis"]["uniqueness"]
        logger.info("")
        logger.info("  AI生成用例去重性:")
        logger.info(f"    - 完全重复: {ai_unique.get('exact_duplicate_count', 0)}")
        logger.info(f"    - 高度相似: {ai_unique.get('near_duplicate_count', 0)}")
        logger.info(f"    - 多样性分数: {ai_unique.get('diversity_score', 0):.4f}")
    
    if "uniqueness" in human_results.get("detailed_analysis", {}):
        human_unique = human_results["detailed_analysis"]["uniqueness"]
        logger.info("")
        logger.info("  人工编写用例去重性:")
        logger.info(f"    - 完全重复: {human_unique.get('exact_duplicate_count', 0)}")
        logger.info(f"    - 高度相似: {human_unique.get('near_duplicate_count', 0)}")
        logger.info(f"    - 多样性分数: {human_unique.get('diversity_score', 0):.4f}")
    
    # 覆盖率分析
    if "coverage" in ai_results.get("detailed_analysis", {}):
        ai_coverage = ai_results["detailed_analysis"]["coverage"]
        logger.info("")
        logger.info("  AI生成用例覆盖率:")
        logger.info(f"    - 需求覆盖: {ai_coverage['requirement_coverage'].get('coverage_rate', 0):.4f}")
        logger.info(f"    - 功能覆盖: {ai_coverage['feature_coverage'].get('feature_coverage_rate', 0):.4f}")
        logger.info(f"    - 综合覆盖: {ai_coverage.get('overall_coverage', 0):.4f}")
    
    if "coverage" in human_results.get("detailed_analysis", {}):
        human_coverage = human_results["detailed_analysis"]["coverage"]
        logger.info("")
        logger.info("  人工编写用例覆盖率:")
        logger.info(f"    - 需求覆盖: {human_coverage['requirement_coverage'].get('coverage_rate', 0):.4f}")
        logger.info(f"    - 功能覆盖: {human_coverage['feature_coverage'].get('feature_coverage_rate', 0):.4f}")
        logger.info(f"    - 综合覆盖: {human_coverage.get('overall_coverage', 0):.4f}")
    
    # 相似度分析
    if "similarity" in ai_results.get("detailed_analysis", {}):
        ai_similarity = ai_results["detailed_analysis"]["similarity"]
        logger.info("")
        logger.info("  AI生成用例与人工用例的相似度:")
        logger.info(f"    - 高相似度用例数: {ai_similarity.get('high_similarity_count', 0)}")
        logger.info(f"    - 低相似度用例数: {ai_similarity.get('low_similarity_count', 0)}")
        logger.info(f"    - 平均最大相似度: {ai_similarity.get('mean_max_similarity', 0):.4f}")
        logger.info(f"    - 覆盖率: {ai_similarity.get('coverage_rate', 0):.4f}")
    
    logger.info("")
    
    # 改进建议
    logger.info("💡 【改进建议】")
    
    if ai_overall < human_overall:
        improvement_rate = (human_overall - ai_overall) / human_overall * 100
        logger.info(f"  AI生成用例总体质量低于人工用例 {improvement_rate:.1f}%")
        
        # 找出最弱的维度
        min_score = float('inf')
        min_metric = ""
        for metric_name, metric_key in metrics:
            score = ai_scores.get(metric_key, 0)
            if score < min_score:
                min_score = score
                min_metric = metric_name
        
        if min_score < 0.7:
            logger.info(f"  1. 重点改进: {min_metric} (当前分数: {min_score:.4f})")
        
        if ai_scores.get("uniqueness_score", 1) < 0.8:
            logger.info("  2. 增加用例多样性，减少重复")
        
        if ai_scores.get("coverage_score", 1) < 0.8:
            logger.info("  3. 扩大需求覆盖范围")
        
        if ai_scores.get("avg_quality_score", 1) < 0.8:
            logger.info("  4. 提高用例描述的清晰度和具体性")
    
    else:
        improvement_rate = (ai_overall - human_overall) / human_overall * 100
        logger.info(f"  AI生成用例总体质量高于人工用例 {improvement_rate:.1f}%")
        logger.info("  ✓ AI生成效果良好，可继续优化")
    
    logger.info("")


if __name__ == "__main__":
    run_demo()

