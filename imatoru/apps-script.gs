/**
 * いま録る — 受け取り用 Google Apps Script
 *
 * スマホの「いま録る」から送られた音声と文字を、このスクリプトを置いた
 * Googleアカウントのドライブに保存します。
 *
 *  いま録る/                 … ドライブに自動で作られるフォルダ
 *    いま録る_記録           … スプレッドシート（1件 = 1行）
 *    田中ヨシエさん/          … 「だれの話」ごとのフォルダ
 *      2026-11-24_2150_田中ヨシエさん.m4a
 *      2026-11-24_2150_田中ヨシエさん.txt
 *
 * 準備（最初の1回だけ）
 *  1. script.google.com で新しいプロジェクトを作り、このファイルの中身を貼る
 *  2. 上のメニューで関数「setup」を選んで実行 → 許可を求められたら許可
 *     実行ログに「合言葉」が出るので控えておく
 *  3. 右上「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *     ・次のユーザーとして実行：自分
 *     ・アクセスできるユーザー：全員
 *     → 「デプロイ」で出るURL（…/exec）を控える
 *  4. スマホの「いま録る」→ 設定 に、URLと合言葉を入れる
 */

const ROOT_NAME = 'いま録る';
const SHEET_NAME = 'いま録る_記録';
const TZ = 'Asia/Tokyo';

function setup() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('KEY')) {
    props.setProperty('KEY', Utilities.getUuid().replace(/-/g, '').slice(0, 12));
  }
  const root = getRoot_();
  const sheet = getSheet_(root);
  Logger.log('保存先フォルダ: ' + root.getUrl());
  Logger.log('記録の表: ' + sheet.getParent().getUrl());
  Logger.log('合言葉: ' + props.getProperty('KEY'));
}

function doGet() {
  return json_({ ok: true, app: 'imatoru' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const p = JSON.parse(e.postData.contents);
    const key = PropertiesService.getScriptProperties().getProperty('KEY');
    if (!key || p.key !== key) return json_({ ok: false, error: 'key' });

    lock.waitLock(20000);
    const root = getRoot_();
    const who = clean_(p.who) || '未分類';
    const folder = child_(root, who);
    const at = new Date(Number(p.at) || Date.now());
    const stamp = Utilities.formatDate(at, TZ, 'yyyy-MM-dd_HHmm');
    const base = stamp + '_' + who;

    let audioUrl = '';
    if (p.audio) {
      const blob = Utilities.newBlob(Utilities.base64Decode(p.audio), p.mime || 'audio/webm', base + '.' + (p.ext || 'webm'));
      audioUrl = folder.createFile(blob).getUrl();
    }
    const text = String(p.text || '');
    if (text) folder.createFile(base + '.txt', text, MimeType.PLAIN_TEXT);

    getSheet_(root).appendRow([
      Utilities.formatDate(at, TZ, 'yyyy/MM/dd'),
      Utilities.formatDate(at, TZ, 'HH:mm'),
      String(p.who || ''),
      String(p.by || ''),
      text,
      audioUrl,
      Number(p.seconds) || ''
    ]);
    return json_({ ok: true, audioUrl: audioUrl });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function getRoot_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROOT_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const folder = DriveApp.createFolder(ROOT_NAME);
  props.setProperty('ROOT_ID', folder.getId());
  return folder;
}

function getSheet_(root) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id).getSheets()[0]; } catch (e) {} }
  const ss = SpreadsheetApp.create(SHEET_NAME);
  DriveApp.getFileById(ss.getId()).moveTo(root);
  const sh = ss.getSheets()[0];
  sh.setName('記録');
  sh.appendRow(['日付', '時刻', 'だれの話', '話した人', '話した内容（文字）', '音声', '長さ（秒）']);
  sh.setFrozenRows(1);
  sh.setColumnWidth(5, 480);
  props.setProperty('SHEET_ID', ss.getId());
  return sh;
}

function child_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function clean_(s) {
  return String(s || '').replace(/[\\/:*?"<>|\r\n]/g, '_').trim().slice(0, 40);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
