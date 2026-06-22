#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Локальное зеркало сайта на Tilda (okna-veles-group.ru).
Скачивает HTML, CSS, JS, картинки, видео, шрифты и переписывает все
ссылки с CDN на локальные относительные пути. Результат — самодостаточная
статичная копия, открывается офлайн.
"""
import os
import re
import sys
import time
import hashlib
import urllib.request
import urllib.error
from urllib.parse import urlsplit, urljoin

ROOT = "/Users/sherzat/welton"
ASSETS = os.path.join(ROOT, "assets")
SRC_HOST = "okna-veles-group.ru"

# Страницы сайта: исходный путь -> локальное имя файла
PAGES = {
    "/": "index.html",
    "/agreement": "agreement.html",
    "/policy": "policy.html",
}

# Откуда разрешено тянуть ассеты
ALLOWED_HOSTS = {
    "static.tildacdn.com", "thb.tildacdn.com", "neo.tildacdn.com",
    "ws.tildacdn.com", "assets.tildacdn.com",
    "assets.codepen.io", "cdn.postnikovmd.com",
    "cdnjs.cloudflare.com", "unpkg.com",
    "fonts.googleapis.com", "fonts.gstatic.com",
}

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

# Регэксп для абсолютных и протокол-относительных URL
URL_RE = re.compile(r"""(?:https?:)?//[^\s"'()<>\\]+""")
CSS_URL_RE = re.compile(r"""url\(\s*(['"]?)([^'")]+)\1\s*\)""")
CSS_IMPORT_RE = re.compile(r"""@import\s+(?:url\()?\s*(['"])([^'"]+)\1""")

url_to_localabs = {}   # абсолютный url -> локальный абсолютный путь файла
failures = []
queue = []             # список (abs_url, is_css)
queued = set()


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA,
                                               "Accept": "*/*",
                                               "Accept-Encoding": "gzip, deflate",
                                               "Referer": "https://%s/" % SRC_HOST})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                data = r.read()
                enc = (r.headers.get("Content-Encoding", "") or "").lower()
                if enc == "gzip" or data[:2] == b"\x1f\x8b":
                    import gzip as _gz
                    try:
                        data = _gz.decompress(data)
                    except Exception:
                        pass
                elif enc == "deflate":
                    import zlib as _zl
                    try:
                        data = _zl.decompress(data)
                    except Exception:
                        data = _zl.decompress(data, -_zl.MAX_WBITS)
                return data, r.headers.get("Content-Type", "")
        except Exception as e:
            if attempt == 2:
                failures.append((url, str(e)))
                return None, None
            time.sleep(1.0)
    return None, None


def normalize(u):
    if u.startswith("//"):
        u = "https:" + u
    return u


def host_of(u):
    return urlsplit(u).netloc.lower()


def local_relpath_for(abs_url):
    """Относительный путь под assets/ для данного URL."""
    p = urlsplit(abs_url)
    host = p.netloc
    path = p.path
    if path in ("", "/"):
        path = "/index"
    # Google Fonts css?... -> уникальное имя .css
    if host == "fonts.googleapis.com":
        h = hashlib.md5((path + "?" + p.query).encode()).hexdigest()[:8]
        path = path.rstrip("/") + "_" + h + ".css"
    elif path.endswith("/"):
        path = path + "index"
    rel = host + path
    rel = rel.replace("\\", "/")
    return rel


def is_css_url(abs_url, ctype=""):
    if host_of(abs_url) == "fonts.googleapis.com":
        return True
    if abs_url.split("?")[0].lower().endswith(".css"):
        return True
    if "text/css" in (ctype or ""):
        return True
    return False


def register_asset(abs_url, is_css=False):
    abs_url = normalize(abs_url)
    if host_of(abs_url) not in ALLOWED_HOSTS:
        return None
    if abs_url not in url_to_localabs:
        rel = local_relpath_for(abs_url)
        localabs = os.path.join(ASSETS, rel)
        url_to_localabs[abs_url] = localabs
    if abs_url not in queued:
        queue.append((abs_url, is_css))
        queued.add(abs_url)
    return url_to_localabs[abs_url]


def save_bytes(localabs, data):
    os.makedirs(os.path.dirname(localabs), exist_ok=True)
    with open(localabs, "wb") as f:
        f.write(data)


def process_css(abs_url, localabs, text):
    """Найти url()/@import внутри CSS, скачать их, переписать на относительные."""
    css_dir = os.path.dirname(localabs)
    refs = set()
    for m in CSS_URL_RE.finditer(text):
        refs.add(m.group(2).strip())
    for m in CSS_IMPORT_RE.finditer(text):
        refs.add(m.group(2).strip())

    replace = {}
    for ref in refs:
        if ref.startswith("data:") or ref.startswith("#"):
            continue
        target = normalize(urljoin(abs_url, ref))
        if host_of(target) not in ALLOWED_HOSTS:
            continue
        target_local = register_asset(target, is_css=is_css_url(target))
        if target_local:
            # корне-относительный путь: устойчив к резолву url() в CSS-переменных
            rel = "/" + os.path.relpath(target_local, ROOT).replace("\\", "/")
            replace[ref] = rel

    def sub_url(m):
        q, ref = m.group(1), m.group(2).strip()
        if ref in replace:
            return "url(%s%s%s)" % (q, replace[ref], q)
        return m.group(0)

    def sub_import(m):
        q, ref = m.group(1), m.group(2).strip()
        if ref in replace:
            return '@import %s%s%s' % (q, replace[ref], q)
        return m.group(0)

    text = CSS_URL_RE.sub(sub_url, text)
    text = CSS_IMPORT_RE.sub(sub_import, text)
    save_bytes(localabs, text.encode("utf-8"))


def rewrite_html(text, html_local_dir):
    """Переписать все ассет-URL и внутренние ссылки на локальные пути."""
    # 0) Отключаем оптимизацию картинок Tilda (берём локальные оригиналы,
    #    без обращений к optim.tildacdn.com за webp/resize-вариантами)
    text = text.replace(
        '<div id="allrecords" class="t-records" ',
        '<div id="allrecords" class="t-records" data-tilda-imgoptimoff="yes" ')

    # 1) Внутренние ссылки на страницы
    for src_path, local_name in PAGES.items():
        if src_path == "/":
            for token in ['href="https://%s/"' % SRC_HOST,
                          'href="https://%s"' % SRC_HOST,
                          'href="http://%s/"' % SRC_HOST,
                          "href=\"/\""]:
                text = text.replace(token, 'href="index.html"')
        else:
            for token in ['href="https://%s%s"' % (SRC_HOST, src_path),
                          'href="%s"' % src_path]:
                text = text.replace(token, 'href="%s"' % local_name)

    # 2) Ассеты: заменяем самые длинные токены первыми
    tokens = sorted(set(URL_RE.findall(text)), key=len, reverse=True)
    for tok in tokens:
        abs_url = normalize(tok)
        if host_of(abs_url) not in ALLOWED_HOSTS:
            continue
        if abs_url in url_to_localabs:
            rel = "/" + os.path.relpath(url_to_localabs[abs_url], ROOT).replace("\\", "/")
            text = text.replace(tok, rel)
    return text


def collect_from_html(text):
    for tok in set(URL_RE.findall(text)):
        abs_url = normalize(tok)
        if host_of(abs_url) in ALLOWED_HOSTS:
            register_asset(abs_url, is_css=is_css_url(abs_url))


def main():
    # 1. Читаем заранее скачанные HTML
    raw_html = {
        "index.html": "/tmp/veles_home.html",
        "agreement.html": "/tmp/veles_agreement.html",
        "policy.html": "/tmp/veles_policy.html",
    }
    htmls = {}
    for name, path in raw_html.items():
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            htmls[name] = f.read()

    # 2. Собираем ассеты из всех страниц
    for name, text in htmls.items():
        collect_from_html(text)
    print("Ассетов в очереди после HTML: %d" % len(queue))

    # 3. Качаем очередь (CSS обрабатываем рекурсивно)
    done = 0
    while queue:
        abs_url, is_css = queue.pop(0)
        localabs = url_to_localabs[abs_url]
        if os.path.exists(localabs) and not is_css:
            continue
        data, ctype = fetch(abs_url)
        done += 1
        if data is None:
            print("  ✗ FAIL %s" % abs_url)
            continue
        if is_css or is_css_url(abs_url, ctype):
            try:
                process_css(abs_url, localabs, data.decode("utf-8", "replace"))
            except Exception as e:
                save_bytes(localabs, data)
                failures.append((abs_url, "css:" + str(e)))
        else:
            save_bytes(localabs, data)
        if done % 10 == 0:
            print("  ... скачано %d, в очереди %d" % (done, len(queue)))

    print("Всего скачано файлов: %d" % done)

    # 4. Переписываем и сохраняем HTML
    for name, text in htmls.items():
        out = rewrite_html(text, ROOT)
        with open(os.path.join(ROOT, name), "w", encoding="utf-8") as f:
            f.write(out)
        print("  ✓ %s" % name)

    # 5. Отчёт об ошибках
    if failures:
        print("\n=== НЕ СКАЧАНО (%d) ===" % len(failures))
        for u, e in failures[:40]:
            print("  %s  -> %s" % (u, e))
    else:
        print("\nОшибок нет — всё скачано.")


if __name__ == "__main__":
    main()
