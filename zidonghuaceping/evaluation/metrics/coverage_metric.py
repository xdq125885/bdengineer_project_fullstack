"""
覆盖率指标 - 评估生成的测试用例对需求的覆盖程度（增强版）
"""

from typing import List, Dict, Set
import re
import logging

# 相对导入配置以获取阈值
from ..config import COVERAGE_CONFIG

logger = logging.getLogger(__name__)


class CoverageMetric:
    """
    评估测试用例对需求的覆盖率
    
    增强点：
    1) 支持从 Markdown 的“业务规则/功能需求”等小节解析列表作为需求点
    2) 句式匹配作为补充（应该/需要/必须/用户/系统）
    3) 中文/英文混合轻量分词 + 同义词归一化
    4) 阈值可从 COVERAGE_CONFIG.requirement_overlap_threshold 配置
    5) 覆盖判定使用 max(Jaccard, 以需求为分母, 以用例为分母) 的综合分数，适配中/英文差异
    """
    
    # 只把真正的“规则/需求”小节当作需求来源，避免把“用例示例”当作需求
    SECTION_TITLES = [
        "业务规则", "功能规则", "功能需求", "需求列表", "需求点", "规则", "业务约束", "验收标准"
    ]

    BULLET_PATTERNS = [
        r"^\s*[-*•]\s+(.+)$",                   # - xxx / * xxx / • xxx
        r"^\s*\d+[\.|、)]\s*(.+)$",            # 1. xxx / 1、xxx / 1) xxx
        r"^\s*[（(]?\d+[）)]\s*(.+)$",           # （1）xxx 或 (1) xxx
    ]

    SENTENCE_PATTERNS = [
        r"[应需必]该[^。！？]*[。！？]",
        r"[应需必]要[^。！？]*[。！？]",
        r"用户[^。！？]*[。！？]",
        r"系统[^。！？]*[。！？]",
    ]

    # 简易同义词归一化表（需求/用例两侧同时使用）
    SYNONYMS = {
        # 登录/登陆
        "登陆": "登录", "登入": "登录", "log": "登录", "login": "登录", "logon": "登录",
        # 账号/用户名/账户
        "用户名": "账号", "账户": "账号", "user": "账号", "account": "账号",
        # 密码/口令
        "口令": "密码", "pass": "密码", "password": "密码",
        # 验证码
        "图形验证码": "验证码", "captcha": "验证码",
        # 首页/主页/主页面
        "系统首页": "首页", "主页": "首页", "主页面": "首页", "home": "首页",
        # 跳转/重定向
        "重定向": "跳转", "redirect": "跳转",
        # 成功/通过
        "通过": "成功",
        # 错误/失败
        "失败": "错误",
        # 输入/填写
        "填写": "输入",
        # 登录页面/登录页
        "登录页面": "登录页", "登陆页面": "登录页", "登陆页": "登录页",
    }

    # 常见停用词
    STOPWORDS_REQ = {
        '的','了','和','是','在','有','用','可以','应该','需要','必须','用户','系统','进行','操作','能够','支持',
        '以及','并且','如果','当','则','对于','针对','以便','保证','确保','提供','实现','相关','功能','页面','界面'
    }
    STOPWORDS_CASE = STOPWORDS_REQ | {'点击','输入','打开','然后','并且','以及','确认','提交','查看'}

    def __init__(self):
        """初始化覆盖率指标"""
        pass

    # ----------------------------
    # PRD 解析相关辅助函数
    # ----------------------------
    def _normalize_line(self, line: str) -> str:
        line = line.strip()
        # 去掉行尾中文/英文句号
        line = re.sub(r"[。．.\s]+$", "", line)
        return line

    def _split_tokens(self, text: str) -> List[str]:
        """轻量分词：
        - 英文/数字/符号：按连续段切分
        - 中文：避免过度切分，保留常见词片（2~3字）以提高匹配鲁棒性
        """
        tokens: List[str] = []
        # 提取连续的中文段与英文/数字段
        spans = re.findall(r"[\u4e00-\u9fa5]+|[A-Za-z0-9_@#\+\-]+", text)
        for span in spans:
            # 英文/数字段：直接加入（小写化以增强匹配）
            if all(ord(c) < 128 for c in span):
                tokens.append(span.lower())
            else:
                # 中文段：做2-gram + 3-gram 的混合，控制上限
                if len(span) <= 3:
                    tokens.append(span)
                else:
                    # 仅抽取若干关键片段，防止分母过大
                    grams: Set[str] = set()
                    for k in (2, 3):
                        for i in range(len(span) - k + 1):
                            grams.add(span[i:i+k])
                    # 仅保留长度在[2,3]的片段，且最多取前15个
                    for g in list(grams)[:15]:
                        tokens.append(g)
        return tokens

    def _normalize_tokens(self, tokens: Set[str]) -> Set[str]:
        norm: Set[str] = set()
        for t in tokens:
            key = t.lower() if t.isascii() else t
            tt = self.SYNONYMS.get(key, key)
            norm.add(tt)
        return norm

    def _extract_section_text(self, prd_text: str, section_titles: List[str]) -> str:
        """
        提取 Markdown 中指定小节的纯文本（从匹配的标题开始，到下一个同级或更高级标题前）。
        仅识别 # / ## / ### 风格标题。
        """
        lines = prd_text.splitlines()
        section_start = -1
        section_level = None

        # 预编译标题正则
        title_regexes = [re.compile(rf"^\s*#{{1,6}}\s*{re.escape(t)}\s*$") for t in section_titles]
        heading_regex = re.compile(r"^(?P<hash>#{1,6})\s*(?P<title>.+?)\s*$")

        for i, raw in enumerate(lines):
            line = raw.strip()
            for reg in title_regexes:
                if reg.match(line):
                    section_start = i + 1
                    m = heading_regex.match(line)
                    section_level = len(m.group("hash")) if m else 2
                    break
            if section_start != -1:
                break

        if section_start == -1:
            return ""

        # 收集到下一个同级或更高级标题之前
        collected: List[str] = []
        for j in range(section_start, len(lines)):
            line = lines[j]
            m = heading_regex.match(line.strip())
            if m and len(m.group("hash")) <= (section_level or 2):
                break
            collected.append(line)

        return "\n".join(collected)

    def _extract_bullets(self, section_text: str) -> List[str]:
        """从小节文本中提取项目符号/编号条目。"""
        if not section_text:
            return []
        bullets = []
        for raw in section_text.splitlines():
            for pat in self.BULLET_PATTERNS:
                m = re.match(pat, raw.strip())
                if m:
                    item = self._normalize_line(m.group(1))
                    if item:
                        bullets.append(item)
                    break
        return bullets

    def _extract_sentence_requirements(self, prd_text: str) -> List[str]:
        reqs = []
        for pat in self.SENTENCE_PATTERNS:
            reqs.extend(re.findall(pat, prd_text))
        # 归一化
        reqs = [self._normalize_line(x) for x in reqs]
        return [r for r in reqs if r]

    # ----------------------------
    # 需求提取（主流程）
    # ----------------------------
    def extract_requirements(self, prd_text: str) -> List[str]:
        """
        从PRD文本中提取需求点（增强版）
        
        优先：解析“业务规则/功能需求”等 Markdown 小节下的项目符号/编号列表
        其次：回落到启发式句式匹配（应该/需要/必须/用户/系统等）
        
        Returns:
            需求点列表（去重、去噪）
        """
        requirements: List[str] = []

        # 1) 解析业务规则等小节
        section_text = self._extract_section_text(prd_text, self.SECTION_TITLES)
        bullets = self._extract_bullets(section_text)
        if bullets:
            logger.info(f"在指定小节中解析出 {len(bullets)} 条列表项作为需求点")
            requirements.extend(bullets)

        # 2) 启发式句式匹配（补充）
        sent_reqs = self._extract_sentence_requirements(prd_text)
        if sent_reqs:
            logger.info(f"通过句式匹配补充解析出 {len(sent_reqs)} 条需求候选")
            requirements.extend(sent_reqs)

        # 3) 如仍为空，尝试从全文直接抓取项目符号
        if not requirements:
            bullets_all = self._extract_bullets(prd_text)
            if bullets_all:
                logger.info(f"未命中小节标题，改为从全文提取 {len(bullets_all)} 条列表项")
                requirements.extend(bullets_all)

        # 去重与清洗
        cleaned = []
        seen = set()
        for r in requirements:
            rr = self._normalize_line(r)
            # 去掉过短或纯无信息项
            if not rr or len(rr) < 2:
                continue
            if rr in seen:
                continue
            seen.add(rr)
            cleaned.append(rr)

        logger.info(f"最终提取需求点数量: {len(cleaned)}")
        return cleaned

    # ----------------------------
    # 关键词提取
    # ----------------------------
    def extract_keywords_from_requirement(self, requirement: str) -> Set[str]:
        tokens = set(self._split_tokens(requirement))
        # 去停用词
        tokens = {t for t in tokens if len(t) > 1 and (t.lower() if t.isascii() else t) not in self.STOPWORDS_REQ}
        # 同义词归一
        tokens = self._normalize_tokens(tokens)
        return tokens

    def extract_keywords_from_test_case(self, test_case: str) -> Set[str]:
        tokens = set(self._split_tokens(test_case))
        tokens = {t for t in tokens if len(t) > 1 and (t.lower() if t.isascii() else t) not in self.STOPWORDS_CASE}
        tokens = self._normalize_tokens(tokens)
        return tokens

    # ----------------------------
    # 覆盖率计算
    # ----------------------------
    def calculate_requirement_coverage(
        self,
        requirements: List[str],
        test_cases: List[str],
        similarity_threshold: float = None,
    ) -> Dict:
        """
        计算需求覆盖率：使用综合相似度（max(Jaccard, req_ratio, case_ratio)）
        - Jaccard = |A∩B| / |A∪B|
        - req_ratio = |A∩B| / |A|（以需求关键词为分母）
        - case_ratio = |A∩B| / |B|（以用例关键词为分母）
        """
        if similarity_threshold is None:
            similarity_threshold = COVERAGE_CONFIG.get("requirement_overlap_threshold", 0.5)

        if not requirements:
            return {
                "coverage_rate": 1.0,
                "covered_count": 0,
                "uncovered_count": 0,
                "total_requirements": 0,
                "covered_requirements": [],
                "uncovered_requirements": [],
                "coverage_details": {},
                "threshold_used": similarity_threshold,
            }

        covered_requirements = []
        uncovered_requirements = []
        coverage_details = {}

        for req in requirements:
            req_keywords = self.extract_keywords_from_requirement(req)

            if not req_keywords:
                uncovered_requirements.append(req)
                coverage_details[req] = {"covered": False, "matching_cases": []}
                continue

            is_covered = False
            matching_cases = []

            for idx, test_case in enumerate(test_cases):
                case_keywords = self.extract_keywords_from_test_case(test_case)
                if not case_keywords:
                    continue

                inter = req_keywords & case_keywords
                union = req_keywords | case_keywords
                inter_cnt = len(inter)
                if inter_cnt == 0:
                    continue

                jaccard = inter_cnt / len(union) if union else 0.0
                req_ratio = inter_cnt / len(req_keywords) if req_keywords else 0.0
                case_ratio = inter_cnt / len(case_keywords) if case_keywords else 0.0
                score = max(jaccard, req_ratio, case_ratio)

                if score >= similarity_threshold:
                    is_covered = True
                    matching_cases.append({
                        "case_index": idx,
                        "score": round(score, 4),
                        "jaccard": round(jaccard, 4),
                        "req_ratio": round(req_ratio, 4),
                        "case_ratio": round(case_ratio, 4),
                        "matched_keywords": sorted(list(inter)),
                    })

            if is_covered:
                covered_requirements.append(req)
            else:
                uncovered_requirements.append(req)

            coverage_details[req] = {
                "covered": is_covered,
                "matching_cases": matching_cases,
                "req_keywords": sorted(list(req_keywords)),
            }

        coverage_rate = len(covered_requirements) / len(requirements)

        return {
            "coverage_rate": coverage_rate,
            "covered_count": len(covered_requirements),
            "uncovered_count": len(uncovered_requirements),
            "total_requirements": len(requirements),
            "covered_requirements": covered_requirements,
            "uncovered_requirements": uncovered_requirements,
            "coverage_details": coverage_details,
            "threshold_used": similarity_threshold,
        }

    def calculate_feature_coverage(self, test_cases: List[str]) -> Dict:
        """
        计算功能特性覆盖率（规则留存）
        """
        features = {
            "正常流程": r"正常|成功|成功登录|正确",
            "异常流程": r"异常|失败|错误|不正确|无效",
            "边界值": r"边界|极限|最大|最小|为空|空值",
            "权限控制": r"权限|权限检查|访问控制|认证|授权",
            "数据验证": r"验证|校验|检查|合法|非法",
            "性能": r"性能|速度|响应|超时|延迟",
            "并发": r"并发|同时|并行|竞态",
        }

        feature_coverage = {}

        for feature_name, pattern in features.items():
            count = 0
            for test_case in test_cases:
                if re.search(pattern, test_case, re.IGNORECASE):
                    count += 1

            feature_coverage[feature_name] = {
                "count": count,
                "covered": count > 0,
            }

        covered_features = sum(1 for v in feature_coverage.values() if v["covered"])
        total_features = len(feature_coverage)

        return {
            "feature_coverage": feature_coverage,
            "covered_features": covered_features,
            "total_features": total_features,
            "feature_coverage_rate": covered_features / total_features if total_features > 0 else 0.0,
        }

    def evaluate(self, prd_text: str, test_cases: List[str]) -> Dict:
        """
        完整的覆盖率评估
        """
        requirements = self.extract_requirements(prd_text)
        requirement_coverage = self.calculate_requirement_coverage(
            requirements, test_cases, similarity_threshold=COVERAGE_CONFIG.get("requirement_overlap_threshold", 0.4)
        )
        feature_coverage = self.calculate_feature_coverage(test_cases)

        # 综合覆盖率
        overall_coverage = (
            requirement_coverage["coverage_rate"] * 0.6 + feature_coverage["feature_coverage_rate"] * 0.4
        )

        return {
            "requirement_coverage": requirement_coverage,
            "feature_coverage": feature_coverage,
            "overall_coverage": overall_coverage,
            "requirements_extracted": len(requirements),
        }

