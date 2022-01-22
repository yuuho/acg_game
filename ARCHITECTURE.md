# 開発ドキュメント

## ディレクトリ構成

```
- src/
    - controller.js
    - game.js
    - glutil.js
    - main.js
    - offscreen.js
    - realscreen.js
    - scene_config.js
    - scene_game.js
    - scene_start.js
    - scene_test1.js
    - scene_test2.js
    - scenebase.js
    - strutil.js        : テキスト
- favicon.ico            : アイコン
- icon-152x152.png       : アイコン
- icon-192x192.png       : アイコン
- icon-512x512.png       : アイコン
- index.html    : ファイルを追加したらここに書く
- manifest.json : 編集不要
- sw.js         : ファイルを追加したらここに書く
```


## 諸々の仕組み

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


## 各シーンのメソッド

- ``constructor`` : RealScreen,GameTimer,SceneManager などのインスタンスを受け取り。
                    シーンの `scene_initialize` メソッドを呼ぶ。
                    SceneBase で定義済みのものをそのまま使う
- ``scene_initialize`` : シーン固有の諸々を初期化したりするメソッド。
- ``enter`` : シーン切り替えで入る際にやる処理。
                RealScreen が描画すべき画面としてそのシーンを登録する処理が必須。
                登録前に ``scene_initialize`` 内でも ``enter`` 内でも良いが offScreen という
                プロパティに offscreen を作成する処理が必須。
- ``exit`` : シーンの切り替えで抜けるときにやる処理。
- ``render`` : シーンがアクティブなときに毎フレーム呼ばれる。
                このメソッド内で OffScreen の中身を更新しなければいけない。
                コントローラーの状況確認や、諸々のモデルやパラメータを処理するとよい。
- ``open_debugger`` : デバッグモードに入る時の処理 ``debugScreen`` というプロパティに
                    offscreen を作成する処理が必要。
- ``close_debugger`` : デバッグモードから抜けるときの処理
- ``debug_render`` : デバッグ用 offscreen の描画処理


### シーンが作成されるときの順番
1. constructor
    1. scene_initialize()
2. open_debugger()
3. enter()
    1. this.realScreen.setScene()

なので、特に ``scene_initialize`` で必須な処理はない。

## その他

なんか適当に書いていたら各クラスが密に結合してしまって大惨事になったので考え直すかも。
