"""
可视化模块 - 生成评测结果的可视化展示
"""

import json
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class Visualizer:
    """
    评测结果可视化
    
    支持多种可视化方式：
    - 雷达图：展示多维度评分
    - 柱状图：对比不同版本
    - 热力图：展示相似度矩阵
    - 表格：详细数据展示
    """
    
    def __init__(self, output_dir: str = "./visualizations"):
        """
        初始化可视化器
        
        Args:
            output_dir: 输出目录
        """
        self.output_dir = output_dir
    
    def generate_radar_chart_data(self, evaluation_results: Dict) -> Dict:
        """
        生成雷达图数据
        
        Args:
            evaluation_results: 评测结果
            
        Returns:
            雷达图数据
        """
        aggregate_scores = evaluation_results.get("aggregate_scores", {})
        
        # 提取各维度分数
        dimensions = {
            "结构完整性": aggregate_scores.get("avg_structure_score", 0),
            "内容质量": aggregate_scores.get("avg_quality_score", 0),
            "去重性": aggregate_scores.get("uniqueness_score", 0),
            "覆盖率": aggregate_scores.get("coverage_score", 0),
            "相似度": aggregate_scores.get("similarity_score", 0),
        }
        
        return {
            "type": "radar",
            "dimensions": list(dimensions.keys()),
            "values": list(dimensions.values()),
            "overall_score": evaluation_results.get("overall_score", 0),
        }
    
    def generate_comparison_chart_data(self, comparison_results: Dict) -> Dict:
        """
        生成版本对比图表数据
        
        Args:
            comparison_results: 版本对比结果
            
        Returns:
            对比图表数据
        """
        v1_scores = comparison_results["version1"].get("aggregate_scores", {})
        v2_scores = comparison_results["version2"].get("aggregate_scores", {})
        
        metrics = [
            ("结构完整性", "avg_structure_score"),
            ("内容质量", "avg_quality_score"),
            ("去重性", "uniqueness_score"),
            ("覆盖率", "coverage_score"),
            ("相似度", "similarity_score"),
        ]
        
        chart_data = {
            "type": "comparison",
            "metrics": [],
            "version1": [],
            "version2": [],
            "improvements": [],
        }
        
        for metric_name, metric_key in metrics:
            v1_score = v1_scores.get(metric_key, 0)
            v2_score = v2_scores.get(metric_key, 0)
            improvement = v2_score - v1_score
            
            chart_data["metrics"].append(metric_name)
            chart_data["version1"].append(v1_score)
            chart_data["version2"].append(v2_score)
            chart_data["improvements"].append(improvement)
        
        return chart_data
    
    def generate_similarity_heatmap_data(self, similarity_matrix: List[List[float]]) -> Dict:
        """
        生成相似度热力图数据
        
        Args:
            similarity_matrix: 相似度矩阵
            
        Returns:
            热力图数据
        """
        return {
            "type": "heatmap",
            "matrix": similarity_matrix,
            "title": "用例相似度矩阵",
            "x_label": "参考用例",
            "y_label": "生成用例",
        }
    
    def generate_distribution_chart_data(self, scores: List[float]) -> Dict:
        """
        生成分布图数据
        
        Args:
            scores: 分数列表
            
        Returns:
            分布图数据
        """
        # 计算分布统计
        if not scores:
            return {"type": "distribution", "data": []}
        
        sorted_scores = sorted(scores)
        
        # 分组统计
        bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
        bin_labels = ["0-0.2", "0.2-0.4", "0.4-0.6", "0.6-0.8", "0.8-1.0"]
        bin_counts = [0] * len(bins)
        
        for score in scores:
            for i in range(len(bins) - 1):
                if bins[i] <= score < bins[i + 1]:
                    bin_counts[i] += 1
                    break
            else:
                if score == 1.0:
                    bin_counts[-1] += 1
        
        return {
            "type": "distribution",
            "bins": bin_labels,
            "counts": bin_counts,
            "mean": sum(scores) / len(scores),
            "median": sorted_scores[len(sorted_scores) // 2],
            "min": min(scores),
            "max": max(scores),
        }
    
    def generate_html_report(self, evaluation_results: Dict, 
                            output_file: str = "evaluation_report.html") -> str:
        """
        生成HTML格式的报告
        
        Args:
            evaluation_results: 评测结果
            output_file: 输出文件路径
            
        Returns:
            HTML内容
        """
        radar_data = self.generate_radar_chart_data(evaluation_results)
        
        html_content = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试用例评测报告</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {{
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #333;
            border-bottom: 3px solid #007bff;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #555;
            margin-top: 30px;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}
        .metric-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }}
        .metric-card h3 {{
            margin: 0 0 10px 0;
            font-size: 14px;
        }}
        .metric-card .score {{
            font-size: 32px;
            font-weight: bold;
        }}
        .chart-container {{
            position: relative;
            height: 400px;
            margin: 30px 0;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }}
        th {{
            background-color: #f8f9fa;
            font-weight: bold;
        }}
        tr:nth-child(even) {{
            background-color: #f9f9f9;
        }}
        .good {{
            color: #28a745;
        }}
        .warning {{
            color: #ffc107;
        }}
        .danger {{
            color: #dc3545;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 测试用例自动化评测报告</h1>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>综合分数</h3>
                <div class="score">{evaluation_results.get('overall_score', 0):.2f}</div>
            </div>
            <div class="metric-card">
                <h3>总用例数</h3>
                <div class="score">{evaluation_results.get('total_cases', 0)}</div>
            </div>
            <div class="metric-card">
                <h3>结构完整性</h3>
                <div class="score">{evaluation_results.get('aggregate_scores', {}).get('avg_structure_score', 0):.2f}</div>
            </div>
            <div class="metric-card">
                <h3>内容质量</h3>
                <div class="score">{evaluation_results.get('aggregate_scores', {}).get('avg_quality_score', 0):.2f}</div>
            </div>
        </div>
        
        <h2>📊 详细指标</h2>
        <table>
            <tr>
                <th>指标</th>
                <th>分数</th>
                <th>等级</th>
            </tr>
            <tr>
                <td>结构完整性</td>
                <td>{evaluation_results.get('aggregate_scores', {}).get('avg_structure_score', 0):.4f}</td>
                <td class="good">✓</td>
            </tr>
            <tr>
                <td>内容质量</td>
                <td>{evaluation_results.get('aggregate_scores', {}).get('avg_quality_score', 0):.4f}</td>
                <td class="good">✓</td>
            </tr>
            <tr>
                <td>去重性</td>
                <td>{evaluation_results.get('aggregate_scores', {}).get('uniqueness_score', 0):.4f}</td>
                <td class="good">✓</td>
            </tr>
            <tr>
                <td>覆盖率</td>
                <td>{evaluation_results.get('aggregate_scores', {}).get('coverage_score', 0):.4f}</td>
                <td class="good">✓</td>
            </tr>
            <tr>
                <td>相似度</td>
                <td>{evaluation_results.get('aggregate_scores', {}).get('similarity_score', 0):.4f}</td>
                <td class="good">✓</td>
            </tr>
        </table>
        
        <h2>📈 数据分析</h2>
        <div class="chart-container">
            <canvas id="radarChart"></canvas>
        </div>
        
        <script>
            const radarCtx = document.getElementById('radarChart').getContext('2d');
            new Chart(radarCtx, {{
                type: 'radar',
                data: {{
                    labels: {json.dumps(radar_data['dimensions'], ensure_ascii=False)},
                    datasets: [{{
                        label: '评测分数',
                        data: {json.dumps(radar_data['values'])},
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 2,
                        pointRadius: 5,
                        pointBackgroundColor: '#667eea',
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {{
                        r: {{
                            beginAtZero: true,
                            max: 1,
                            ticks: {{
                                stepSize: 0.2
                            }}
                        }}
                    }}
                }}
            }});
        </script>
    </div>
</body>
</html>
"""
        
        return html_content
    
    def export_results(self, evaluation_results: Dict, 
                      output_file: str, 
                      format: str = "json") -> bool:
        """
        导出评测结果
        
        Args:
            evaluation_results: 评测结果
            output_file: 输出文件路径
            format: 输出格式 ("json", "html", "csv")
            
        Returns:
            是否导出成功
        """
        try:
            if format == "json":
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(evaluation_results, f, ensure_ascii=False, indent=2)
            
            elif format == "html":
                html_content = self.generate_html_report(evaluation_results, output_file)
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(html_content)
            
            logger.info(f"评测结果已导出到: {output_file}")
            return True
        
        except Exception as e:
            logger.error(f"导出评测结果失败: {e}")
            return False

