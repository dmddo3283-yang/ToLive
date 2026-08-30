# Live Mood for YouTube

유튜브의 `<video>` 요소를 Web Audio API에 연결해, 음원 자체를 바꾸지 않고 브라우저 재생 단계에서 라이브 공연장 느낌을 더하는 Manifest V3 확장 프로그램 MVP입니다. 별도 팝업 UI 없이 단축키로 작동합니다.

## 설치

<p>
  <a href="https://raw.githubusercontent.com/dmddo3283-yang/ToLive/main/outputs/live-mood-for-youtube.zip" download>⬇️ ZIP 파일 다운로드</a>
</p>

1. Chrome에서 `chrome://extensions`를 엽니다.
2. 개발자 모드를 켭니다.
3. **압축해제된 확장 프로그램을 로드**하고 이 폴더를 선택합니다.
4. 유튜브를 새로고침한 뒤 `Ctrl+Shift+L`(macOS: `Command+Shift+L`)을 눌러 라이브 모드를 켜고 끕니다.
5. 단축키가 다른 확장 프로그램과 겹치면 `chrome://extensions/shortcuts`에서 변경합니다.

## 설계 메모

요청한 Mrs. GREEN APPLE의 대형 공연장 보컬 선명도, Ado 라이브의 극적인 전후감, G-DRAGON 공연의 무대 PA 저역과 질감을 한 프로파일로 절충했습니다. 라이브 녹음에서 반복적으로 나타나는 특징인 직접음 대비 반사음 증가, 30–100 ms 초기 반사, 고역의 완만한 감쇠, 저중역의 온기, 가벼운 버스 컴프레션, 넓어진 스테레오 이미지를 사용합니다. 실제 관객 반응을 무작위로 얹으면 곡의 가사·분위기를 해칠 수 있어 MVP에서는 관객 트랙을 합성하지 않았습니다.

YouTube는 재생 기기·코덱·콘텐츠에 따라 음량과 채널 구성이 달라질 수 있으므로, 먼저 두 버전의 음량을 맞추고 비교하는 것이 중요합니다. 이 확장 프로그램은 원본을 다운로드하거나 저장하지 않습니다.

## 알려진 한계

- 브라우저의 자동재생 정책 때문에 첫 재생 후에 AudioContext가 활성화될 수 있습니다.
- 탭을 닫거나 확장 프로그램을 갱신하면 현재 오디오 그래프가 재생성됩니다.
- 단축키 상태는 Chrome storage에 저장되며, 열려 있는 유튜브 탭에 동시에 전파됩니다.
