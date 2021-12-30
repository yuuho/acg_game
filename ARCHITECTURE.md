# 開発ドキュメント


### 画面について

ダブルバッファリング、というかユーザー側で好き放題にブラウザのウィンドウサイズを
変更されたりする状況、に対応するために RealScreen (= 実際に見える画面)と、
OffScreen (= WebGL の描画処理などを走らせる用の画面)を分けている。

基本的にブラウザウィンドウに入る最大の 16:9 画面が描画されるようなことを想定しているが、
ウィンドウサイズが変更された際に RealScreen インスタンスから OffScreen インスタンスに
通知する処理も入れてあるので、 OffScreen 側で自身のサイズを変更して
フル画面にするみたいなこともできるようにしてある。

### 処理の流れについて

``Game`` クラスが基本的に全てを管理する。
``Game`` が持っている ``SceneManager`` がシーンのスイッチングを担当。
各フレームのレンダリングの際には、
そのときに有効になっている単一のシーンのレンダリング処理が実行される。

各シーンは好きにプログラミングしてください。
シーンの切り替えには SceneManager の ``changeScene()`` を呼び出す感じ。

### コントローラーについて

マウス操作にまだ対応していない。
マウス操作の受け取りが結構難しい？何が欲しいかによる。
クリック、ダブルクリック、ドラッグ、ホバー、ダブルクリックからのドラッグ、 ...etc

各シーンごとに別々のコントローラーを準備するようにした。


## その他

なんか適当に書いていたら各クラスが密に結合してしまって大惨事になったので考え直すかも。

TODO:
- フルスクリーンのサンプル
- デバッグ画面を作る