# Firefly 鍦ㄧ嚎缂栬緫鍚庡彴

## 鍔熻兘

- `/editor/` 鍦ㄧ嚎瀹炴椂缂栧啓 Markdown
- 瀹炴椂棰勮浣跨敤涓庣珯鐐逛竴鑷寸殑 Markdown 鎻掍欢閾撅紙鏁板鍏紡銆丮ermaid銆佹彁閱掑潡銆丟itHub 鍗＄墖銆丩ink Card銆丒xpressive Code锛?- 缃戦〉绔彂甯冨埌 GitHub 浠撳簱锛堣嚜鍔ㄨЕ鍙戝悗缁?CI / Vercel 閮ㄧ讲锛?- 閫傞厤绉诲姩绔細缂栬緫 / 棰勮 / 鍒嗘爮涓夌妯″紡

## 蹇呴渶鐜鍙橀噺

### 鐧诲綍閴存潈

- `EDITOR_PASSWORD`: 缂栬緫鍚庡彴鐧诲綍瀵嗙爜
- `EDITOR_SESSION_SECRET`: 浼氳瘽绛惧悕瀵嗛挜锛堝缓璁?32+ 闅忔満瀛楃锛?- `EDITOR_SESSION_TTL_SECONDS`锛堝彲閫夛級: 浼氳瘽鏈夋晥鏈燂紝榛樿 `43200` 绉?
### 鍙戝竷鍒?GitHub

- `EDITOR_GITHUB_TOKEN`: 鍏峰浠撳簱鍐欏叆鏉冮檺鐨?GitHub Token
- `EDITOR_GITHUB_OWNER`: 浠撳簱 owner
- `EDITOR_GITHUB_REPO`: 浠撳簱鍚?- `EDITOR_GITHUB_BRANCH`锛堝彲閫夛級: 榛樿 `master`
- `EDITOR_POSTS_DIR`锛堝彲閫夛級: 榛樿 `src/content/posts`
- `EDITOR_GITHUB_COMMITTER_NAME`锛堝彲閫夛級: 鎻愪氦鑰呭悕绉?- `EDITOR_GITHUB_COMMITTER_EMAIL`锛堝彲閫夛級: 鎻愪氦鑰呴偖绠?
## GitHub Token 鏉冮檺寤鸿

鏈€灏戦渶瑕?`Contents: Read and write`銆?
## 鏈湴寮€鍙?
1. 鍦ㄦ湰鍦拌缃笂杩扮幆澧冨彉閲忋€?2. 杩愯 `pnpm dev`銆?3. 鎵撳紑 `http://localhost:4321/editor/`銆?
## Vercel 閮ㄧ讲

1. 鍦?Vercel 椤圭洰璁剧疆涓厤缃悓鍚嶇幆澧冨彉閲忋€?2. 纭繚鐢熶骇鐜鍙闂?`/editor/` 涓?`/api/editor/*`銆?3. 鍙戝竷鎿嶄綔浼氱洿鎺ュ啓鍏?GitHub 浠撳簱锛屽搴斿垎鏀細瑙﹀彂浣犲凡鏈夌殑閮ㄧ讲娴佺▼銆?
