from datetime import datetime, timedelta
import xml.etree.ElementTree as ET
from xml.dom import minidom
import re

ns = {
    'content': 'http://purl.org/rss/1.0/modules/content/',
    'wfw': 'http://wellformedweb.org/CommentAPI/',
    'dc': 'http://purl.org/dc/elements/1.1/',
    'wp': 'http://wordpress.org/export/1.2/',
    'excerpt': 'http://wordpress.org/export/1.2/excerpt/'
}
for prefix, uri in ns.items():
    ET.register_namespace(prefix, uri)

rss = ET.Element('rss', version='2.0', attrib={
    'xmlns:excerpt': ns['excerpt'],
    'xmlns:content': ns['content'],
    'xmlns:wfw': ns['wfw'],
    'xmlns:dc': ns['dc'],
    'xmlns:wp': ns['wp'],
})

channel = ET.SubElement(rss, 'channel')
ET.SubElement(channel, 'title').text = 'icoffio demo content'
ET.SubElement(channel, 'link').text = 'https://icoffio.com'
ET.SubElement(channel, 'description').text = 'Seed posts for icoffio'
ET.SubElement(channel, 'language').text = 'ru-RU'
ET.SubElement(channel, '{%s}wxr_version' % ns['wp']).text = '1.2'
ET.SubElement(channel, '{%s}base_site_url' % ns['wp']).text = 'https://icoffio.com'
ET.SubElement(channel, '{%s}base_blog_url' % ns['wp']).text = 'https://icoffio.com'

# Рубрики (должны совпадать по slug с WP)
cats = [('Tech','tech'), ('Apple','apple'), ('Games','games'), ('AI','ai'), ('News','news-2')]
for name, slug in cats:
    term = ET.SubElement(channel, '{%s}category' % ns['wp'])
    ET.SubElement(term, '{%s}category_nicename' % ns['wp']).text = slug
    ET.SubElement(term, '{%s}cat_name' % ns['wp']).text = name

unsplash = [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=1200&auto=format&fit=crop",
]

titles = [
    ("AI",    "Нейросети в кармане: как смартфоны понимают речь"),
    ("Tech",  "Тонкие ноутбуки 2025: что важно при выборе"),
    ("Apple", "iOS 19: пять функций, которые экономят время"),
    ("Games", "Инди‑хиты месяца: что поиграть на выходных"),
    ("News",  "Гаджет недели: смарт‑кольцо с датчиком температуры"),
    ("AI",    "Где хранить свои модели: сравнение облаков для ML"),
    ("Tech",  "Переходим на USB‑C полностью: опыт и лайфхаки"),
    ("Apple", "MacBook для видео: базовый сетап без боли"),
    ("Games", "Почему ретро‑консоли снова в моде"),
    ("News",  "Мини‑обзор: наушники с кейсом‑мышкой — удобно ли это?"),
    ("AI",    "Локальные LLM: когда офлайн лучше, чем облако"),
    ("Tech",  "Мониторы 27–32″: комфортная работа без усталости"),
    ("Apple", "Vision‑динамика: где AR реально полезна"),
    ("Games", "Геймпады и аксессуары: что взять новичку"),
    ("News",  "Смарт‑дом 2025: сценарии, которые работают"),
]

now = datetime.utcnow()
for i, (cat, title) in enumerate(titles):
    item = ET.SubElement(channel, 'item')
    ET.SubElement(item, 'title').text = title
    # латинский slug, чтобы не ломались ссылки
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower().replace('—','-').replace('–','-')).strip('-')
    if not slug: slug = f"demo-{i+1}"
    ET.SubElement(item, '{%s}post_name' % ns['wp']).text = slug
    ET.SubElement(item, 'link').text = f'https://icoffio.com/article/{slug}'
    pub = (now - timedelta(days=i)).strftime('%Y-%m-%d %H:%M:%S')
    ET.SubElement(item, 'pubDate').text = (now - timedelta(days=i)).strftime('%a, %d %b %Y %H:%M:%S +0000')
    ET.SubElement(item, '{%s}post_date' % ns['wp']).text = pub
    ET.SubElement(item, '{%s}post_date_gmt' % ns['wp']).text = pub
    ET.SubElement(item, '{%s}status' % ns['wp']).text = 'publish'
    ET.SubElement(item, '{%s}post_type' % ns['wp']).text = 'post'
    ET.SubElement(item, '{%s}comment_status' % ns['wp']).text = 'closed'
    ET.SubElement(item, '{%s}ping_status' % ns['wp']).text = 'closed'
    # категория
    ET.SubElement(item, 'category', domain='category', nicename=cat.lower()).text = cat
    # отрывок
    excerpt = f"Короткий анонс: {title}. Практичные выводы и ссылки внутри."
    ET.SubElement(item, '{%s}encoded' % ns['excerpt']).text = excerpt
    # контент
    img = unsplash[i % len(unsplash)]
    content_html = f"""
    <p><img src="{img}" alt="" /></p>
    <p><strong>{title}</strong></p>
    <p>Демо‑контент для настройки фронтенда. Суть: что произошло, почему важно и что делать читателю.</p>
    <p>Тестовая публикация: предназначена только для проверки макета и ленты.</p>
    """
    ET.SubElement(item, '{%s}encoded' % ns['content']).text = content_html.strip()
    ET.SubElement(item, '{%s}creator' % ns['dc']).text = 'admin'

xml_str = ET.tostring(rss, encoding='utf-8')
pretty = minidom.parseString(xml_str).toprettyxml(indent="  ", encoding='utf-8')
with open("icoffio_seed_content.wxr.xml", "wb") as f:
    f.write(pretty)

print("Готово: icoffio_seed_content.wxr.xml")