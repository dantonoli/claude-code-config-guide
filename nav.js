// Active nav tab — set based on current page filename
(function(){
  var page = document.body.getAttribute('data-page') || 'index';
  var map = { index:'index.html', l1:'l1.html', l2:'l2.html', l3:'l3.html', l4:'l4.html', l5:'l5.html', mcp:'mcp.html' };
  var target = map[page];
  document.querySelectorAll('.nav-tab').forEach(function(t){
    t.classList.toggle('active', t.getAttribute('href') === target);
  });
})();

// Copy code button
function copyCode(btn){
  var cb = btn.parentElement;
  var clone = cb.cloneNode(true);
  clone.querySelector('.cb-hdr') && clone.querySelector('.cb-hdr').remove();
  clone.querySelector('.copy-btn') && clone.querySelector('.copy-btn').remove();
  navigator.clipboard.writeText(clone.innerText.trim()).then(function(){
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function(){ btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1800);
  });
}

// Guide download button
(function(){
  var btn = document.querySelector('.dl-btn[data-guide-path]');
  if (!btn) return;

  btn.addEventListener('click', function(event){
    event.preventDefault();

    var guidePath = btn.getAttribute('data-guide-path');
    var filename = btn.getAttribute('download') || 'claude-code-guide.md';

    fetch(guidePath)
      .then(function(response){
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
      })
      .then(function(blob){
        var objectUrl = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
      })
      .catch(function(){
        window.open(guidePath, '_blank', 'noopener');
      });
  });
})();
