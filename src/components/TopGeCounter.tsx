import { useState } from 'react';

const TopGeCounter = () => {
  const [imageError, setImageError] = useState(false);
  const siteId = '118079';

  const generateCounterUrl = () => {
    const params = [
      ['ID', siteId],
      ['JS', '11'],
      ['RAND', String(Math.random() * 10000)],
      ['ISFRM', self === top ? '0' : '1'],
      ['REFERER', document.referrer.substring(0, 1000)],
      ['RESOLUTION', `${screen.width}x${screen.height}`],
      ['JL', location.href.substring(0, 1000)],
      ['DEPT', String(screen.colorDepth || screen.pixelDepth)]
    ];
    
    const queryString = params
      .map(([key, value]) => `${key}:${encodeURIComponent(value)}`)
      .join('+');
    
    return `https://counter.top.ge/cgi-bin/count222?${queryString}`;
  };

  const topGeLink = `https://www.top.ge/index.php?h=${siteId}#${siteId}`;

  return (
    <div className="flex justify-center py-4">
      {/* TOP.GE ASYNC COUNTER CODE */}
      <div id="top-ge-counter-container" data-site-id={siteId}>
        <a 
          href={topGeLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img 
            src={generateCounterUrl()}
            alt="TOP.GE"
            title="TOP.GE - ქართული საიტების რეიტინგი"
            style={{ border: 0, minWidth: 88, minHeight: 31 }}
            onError={() => setImageError(true)}
          />
          {/* Fallback text if image doesn't load (preview mode) */}
          {imageError && (
            <span className="text-xs text-muted-foreground hover:text-primary transition-colors">
              TOP.GE
            </span>
          )}
        </a>
      </div>
      {/* / END OF TOP.GE COUNTER CODE */}
    </div>
  );
};

export default TopGeCounter;
