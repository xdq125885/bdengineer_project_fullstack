"""
主程序入口 - 自动化测评系统
"""

import logging
import argparse
from pathlib import Path

from evaluation.evaluator import Evaluator
from evaluation.visualizer import Visualizer
from evaluation.utils import FileUtils, Logger, ReportGenerator, TestCaseParser
from evaluation.config import LOG_DIR, EVALUATION_RESULTS_DIR

# 设置日志
logger = Logger.setup_logger(
    "main",
    log_file=str(LOG_DIR / "evaluation.log"),
    level="INFO"
)


def evaluate_test_cases(generated_cases_file: str,
                       reference_cases_file: str = None,
                       prd_file: str = None,
                       output_dir: str = None) -> bool:
    """
    评估测试用例
    
    Args:
        generated_cases_file: 生成的测试用例文件
        reference_cases_file: 参考用例文件（可选）
        prd_file: 产品需求文档文件（可选）
        output_dir: 输出目录
        
    Returns:
        是否成功
    """
    try:
        if output_dir is None:
            output_dir = str(EVALUATION_RESULTS_DIR)
        
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        logger.info("=" * 60)
        logger.info("开始评估测试用例")
        logger.info("=" * 60)
        
        # 读取生成的用例
        logger.info(f"读取生成用例: {generated_cases_file}")
        generated_cases_text = FileUtils.read_text(generated_cases_file)
        generated_cases = [case.strip() for case in generated_cases_text.split('\n\n') if case.strip()]
        logger.info(f"共读取 {len(generated_cases)} 个生成用例")
        
        # 读取参考用例
        reference_cases = []
        if reference_cases_file:
            logger.info(f"读取参考用例: {reference_cases_file}")
            reference_cases_text = FileUtils.read_text(reference_cases_file)
            reference_cases = [case.strip() for case in reference_cases_text.split('\n\n') if case.strip()]
            logger.info(f"共读取 {len(reference_cases)} 个参考用例")
        
        # 读取PRD
        prd_text = ""
        if prd_file:
            logger.info(f"读取PRD: {prd_file}")
            prd_text = FileUtils.read_text(prd_file)
            logger.info(f"PRD长度: {len(prd_text)} 字符")
        
        # 创建评测器
        logger.info("初始化评测器...")
        evaluator = Evaluator(use_similarity_model=True)
        
        # 执行评测
        logger.info("执行评测...")
        evaluation_results = evaluator.evaluate_batch(
            generated_cases,
            reference_cases if reference_cases else None,
            prd_text if prd_text else None
        )
        
        # 生成报告
        logger.info("生成报告...")
        
        # JSON报告
        json_report_file = Path(output_dir) / "evaluation_results.json"
        FileUtils.write_json(evaluation_results, str(json_report_file))
        logger.info(f"JSON报告已保存: {json_report_file}")
        
        # 文本报告
        text_report = evaluator.generate_report(evaluation_results, output_format="text")
        text_report_file = Path(output_dir) / "evaluation_report.txt"
        FileUtils.write_text(text_report, str(text_report_file))
        logger.info(f"文本报告已保存: {text_report_file}")
        
        # 摘要报告
        summary_report = ReportGenerator.generate_summary_report(evaluation_results)
        summary_report_file = Path(output_dir) / "evaluation_summary.txt"
        FileUtils.write_text(summary_report, str(summary_report_file))
        logger.info(f"摘要报告已保存: {summary_report_file}")
        
        # HTML报告
        visualizer = Visualizer(output_dir)
        html_report_file = Path(output_dir) / "evaluation_report.html"
        visualizer.export_results(evaluation_results, str(html_report_file), format="html")
        logger.info(f"HTML报告已保存: {html_report_file}")
        
        # 打印摘要
        logger.info("")
        logger.info(summary_report)
        
        logger.info("=" * 60)
        logger.info("评测完成！")
        logger.info("=" * 60)
        
        return True
    
    except Exception as e:
        logger.error(f"评测失败: {e}", exc_info=True)
        return False


def compare_versions(version1_file: str,
                    version2_file: str,
                    reference_cases_file: str = None,
                    prd_file: str = None,
                    output_dir: str = None) -> bool:
    """
    比较两个版本的生成结果
    
    Args:
        version1_file: 版本1的用例文件
        version2_file: 版本2的用例文件
        reference_cases_file: 参考用例文件（可选）
        prd_file: 产品需求文档文件（可选）
        output_dir: 输出目录
        
    Returns:
        是否成功
    """
    try:
        if output_dir is None:
            output_dir = str(EVALUATION_RESULTS_DIR)
        
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        logger.info("=" * 60)
        logger.info("开始版本对比")
        logger.info("=" * 60)
        
        # 读取用例
        logger.info(f"读取版本1: {version1_file}")
        version1_text = FileUtils.read_text(version1_file)
        version1_cases = [case.strip() for case in version1_text.split('\n\n') if case.strip()]
        logger.info(f"版本1共 {len(version1_cases)} 个用例")
        
        logger.info(f"读取版本2: {version2_file}")
        version2_text = FileUtils.read_text(version2_file)
        version2_cases = [case.strip() for case in version2_text.split('\n\n') if case.strip()]
        logger.info(f"版本2共 {len(version2_cases)} 个用例")
        
        # 读取参考用例和PRD
        reference_cases = []
        if reference_cases_file:
            reference_cases_text = FileUtils.read_text(reference_cases_file)
            reference_cases = [case.strip() for case in reference_cases_text.split('\n\n') if case.strip()]
        
        prd_text = ""
        if prd_file:
            prd_text = FileUtils.read_text(prd_file)
        
        # 创建评测器
        evaluator = Evaluator(use_similarity_model=True)
        
        # 执行对比
        logger.info("执行版本对比...")
        comparison_results = evaluator.compare_versions(
            version1_cases,
            version2_cases,
            reference_cases if reference_cases else None,
            prd_text if prd_text else None
        )
        
        # 保存结果
        comparison_file = Path(output_dir) / "version_comparison.json"
        FileUtils.write_json(comparison_results, str(comparison_file))
        logger.info(f"对比结果已保存: {comparison_file}")
        
        # 打印对比结果
        logger.info("")
        logger.info("【版本对比结果】")
        logger.info(f"版本1综合分数: {comparison_results['version1'].get('overall_score', 0):.4f}")
        logger.info(f"版本2综合分数: {comparison_results['version2'].get('overall_score', 0):.4f}")
        logger.info(f"总体改进: {comparison_results['overall_improvement']:.2%}")
        
        if comparison_results['improvements']:
            logger.info("改进指标:")
            for metric, improvement in comparison_results['improvements'].items():
                logger.info(f"  - {metric}: +{improvement:.4f}")
        
        if comparison_results['regressions']:
            logger.info("回退指标:")
            for metric, regression in comparison_results['regressions'].items():
                logger.info(f"  - {metric}: -{regression:.4f}")
        
        logger.info("=" * 60)
        logger.info("版本对比完成！")
        logger.info("=" * 60)
        
        return True
    
    except Exception as e:
        logger.error(f"版本对比失败: {e}", exc_info=True)
        return False


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="自动化测评系统 - 评估LLM生成的测试用例质量"
    )
    
    subparsers = parser.add_subparsers(dest="command", help="命令")
    
    # 评测命令
    eval_parser = subparsers.add_parser("evaluate", help="评估测试用例")
    eval_parser.add_argument("generated_cases", help="生成的测试用例文件")
    eval_parser.add_argument("-r", "--reference", help="参考用例文件（可选）")
    eval_parser.add_argument("-p", "--prd", help="产品需求文档文件（可选）")
    eval_parser.add_argument("-o", "--output", help="输出目录（可选）")
    
    # 对比命令
    compare_parser = subparsers.add_parser("compare", help="比较两个版本")
    compare_parser.add_argument("version1", help="版本1的用例文件")
    compare_parser.add_argument("version2", help="版本2的用例文件")
    compare_parser.add_argument("-r", "--reference", help="参考用例文件（可选）")
    compare_parser.add_argument("-p", "--prd", help="产品需求文档文件（可选）")
    compare_parser.add_argument("-o", "--output", help="输出目录（可选）")
    
    args = parser.parse_args()
    
    if args.command == "evaluate":
        success = evaluate_test_cases(
            args.generated_cases,
            args.reference,
            args.prd,
            args.output
        )
        exit(0 if success else 1)
    
    elif args.command == "compare":
        success = compare_versions(
            args.version1,
            args.version2,
            args.reference,
            args.prd,
            args.output
        )
        exit(0 if success else 1)
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

