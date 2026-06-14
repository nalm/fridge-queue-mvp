# 냉장고 MVP

쿠팡/컬리 구매내역 이미지를 올려 냉장고 재료를 기록하고, 소비기한 캘린더와 요리 추천을 확인하는 Vercel 배포용 MVP입니다.

배포 URL: https://deploy-fridge-queue-mvp.vercel.app
GitHub 저장소: https://github.com/nalm/fridge-queue-mvp

## 구성

- `index.html`, `styles.css`, `app.js`: 브라우저 앱
- `api/extract.js`: 구매내역 이미지에서 재료를 추출하는 Vercel 서버리스 함수
- `vercel.json`: 정적 앱 + API 배포 설정

## 로컬 실행

```powershell
npm run dev
```

PowerShell 실행 정책 때문에 `npm.ps1`이 막히면 아래처럼 실행합니다.

```powershell
cmd /c npm.cmd run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 이미지 추출 API 설정

Vercel 프로젝트 환경변수에 다음 값을 설정합니다.

- `OPENAI_API_KEY`: OpenAI API 키
- `OPENAI_MODEL`: 선택 사항. 기본값은 `gpt-5.5`

키가 없으면 앱은 이미지 미리보기, 수동 입력, 샘플 데이터, 냉장고/캘린더/요리 추천 흐름을 계속 사용할 수 있습니다.
또한 브라우저에서 Tesseract.js OCR을 불러와 구매내역 이미지에서 1차 텍스트 추출을 시도합니다. 정확도는 OpenAI API 방식보다 낮을 수 있어, 추출 후 확인 목록에서 사용자가 수정하는 흐름을 기본으로 둡니다.

## 배포

GitHub 저장소에 푸시한 뒤 Vercel에서 해당 저장소를 Import하면 됩니다. 별도 빌드 과정이 없는 정적 앱이라 기본 설정으로 배포됩니다.
