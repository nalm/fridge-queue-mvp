# 냉장고 MVP

제품의 QR코드나 바코드를 스캔해 냉장고 재료를 기록하고, 소비기한 캘린더와 요리 추천을 확인하는 Vercel 배포용 MVP입니다.

배포 URL: https://deploy-fridge-queue-mvp.vercel.app
GitHub 저장소: https://github.com/nalm/fridge-queue-mvp

## 구성

- `index.html`, `styles.css`, `app.js`: 브라우저 앱
- `api/product.js`: 바코드로 공개 제품 데이터베이스를 조회하는 Vercel 서버리스 함수
- `vercel.json`: 정적 앱 + API 배포 설정

## 현재 입력 방식

- 카메라로 QR코드/바코드 스캔
- 바코드/QR 이미지 파일 업로드 후 스캔
- 바코드 숫자 또는 QR 내용 직접 입력
- 공개 제품 데이터베이스에서 제품명을 찾지 못하면 사용자가 제품명, 수량, 소비기한을 직접 입력

## 로컬 실행

```powershell
npm run dev
```

PowerShell 실행 정책 때문에 `npm.ps1`이 막히면 아래처럼 실행합니다.

```powershell
cmd /c npm.cmd run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 제품 조회

서버리스 함수는 Open Food Facts의 제품 조회 API를 사용합니다. 읽기 요청은 별도 인증 없이 동작하지만, API 정책에 따라 식별 가능한 User-Agent를 전송합니다.

제품 DB에서 찾지 못하는 국내 신선식품이나 자체 PB 상품은 직접 입력으로 등록할 수 있습니다. 소비기한은 포장에 표시된 날짜를 우선으로 사용하고, 없으면 앱이 식품군별 기본 보관 기간으로 추정합니다.

## 배포

GitHub 저장소에 푸시한 뒤 Vercel에서 해당 저장소를 Import하면 됩니다. 별도 빌드 과정이 없는 정적 앱이라 기본 설정으로 배포됩니다.
