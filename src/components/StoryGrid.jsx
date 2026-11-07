import { useState } from 'react';
import adapter from '../services/story';
import payload from '../data/story.json';
export default function StoryGrid() {
  const [items] = useState(() =>
    adapter.selectRandom(adapter.normalizeItems(payload), 4),
  );
  const [failed, setFailed] = useState([]);
  return (
    <>
      <div
        className="story__photo-grid"
        data-story-grid
        data-post-count={items.length}
        role="group"
        aria-label="인스타툰 이미지 영역"
      >
        {items.map((item, i) => {
          const Tag = item.postUrl ? 'a' : 'div';
          return (
            <Tag
              key={item.id || item.src}
              className={`story__tile story__tile--${['one', 'two', 'three', 'four'][i]} ${item.postUrl ? 'story__tile--linked' : ''} ${failed.includes(i) ? 'story__tile--failed' : ''}`}
              href={item.postUrl || undefined}
              target={item.postUrl ? '_blank' : undefined}
              rel={item.postUrl ? 'noopener noreferrer' : undefined}
            >
              {!failed.includes(i) && (
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  decoding="async"
                  onError={() => setFailed((old) => [...new Set([...old, i])])}
                />
              )}
            </Tag>
          );
        })}
      </div>
      <p
        className="story__status visually-hidden"
        role="status"
        aria-live="polite"
      >
        {failed.length
          ? `${failed.length}개 이미지를 불러오지 못했습니다.`
          : !items.length
            ? '등록된 이미지가 없습니다.'
            : items.some((item) => !item.postUrl)
              ? 'Instagram 게시물 URL이 등록되지 않은 이미지는 링크 없이 표시됩니다.'
              : ''}
      </p>
    </>
  );
}
