# 냉장고 MVP

제품명과 유통/소비기한이 보이게 촬영한 사진을 업로드해 냉장고 재료를 기록하고, 소비기한 캘린더와 요리 추천을 확인하는 Vercel 배포용 MVP입니다.

배포 URL: https://deploy-fridge-queue-mvp.vercel.app
GitHub 저장소: https://github.com/nalm/fridge-queue-mvp

## 구성

- `index.html`, `styles.css`, `app.js`: 브라우저 앱
- `vercel.json`: 정적 앱 배포 설정

## 현재 입력 방식

- 제품명과 유통/소비기한이 함께 보이는 라벨 사진 업로드
- 여러 장의 이미지 동시 업로드
- Tesseract.js 기반 브라우저 OCR로 제품명과 날짜 추출
- 추출 결과를 저장 전 직접 수정
- OCR이 실패하면 제품명, 수량, 보관 방식, 소비기한 직접 입력

## 사용 팁

- 날짜 부분이 흔들리지 않게 가까이 찍습니다.
- 제품명과 `소비기한`, `유통기한`, `까지` 문구가 한 사진에 같이 나오면 인식률이 올라갑니다.
- 냉동식품처럼 포장 앞면과 뒷면이 나뉘어 있으면 각각 올린 뒤 대기 목록에서 제품명을 수정합니다.
- OCR 결과는 완벽하지 않으므로 저장 전 제품명과 날짜를 확인합니다.

## 로컬 실행

```powershell
npm run dev
```

PowerShell 실행 정책 때문에 `npm.ps1`이 막히면 아래처럼 실행합니다.

```powershell
cmd /c npm.cmd run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 배포

GitHub 저장소에 푸시한 뒤 Vercel에서 해당 저장소를 Import하면 됩니다. 별도 빌드 과정이 없는 정적 앱이라 기본 설정으로 배포됩니다.
