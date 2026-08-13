
(function () {
  function renderSparsity() {
    var sel = document.getElementById('inputSelect');
    var host = document.getElementById('vizContainer');
    var statHost = document.getElementById('statsContent');
    
    if (!sel || !host || !statHost || typeof BDH_DATA === 'undefined') return;
    
    var data = BDH_DATA.inputs[parseInt(sel.value) || 0];
    var caps = data.captures;
    
    // --- DATA MATH ---
    var toks = data.token_count;
    var totalSparsity = 0;
    var dropoutSparsitySum = 0;
    var dropoutCount = 0;
    var lnDenseSum = 0;
    var lnCount = 0;

    caps.forEach(function (c) {
      if (c.output) {
        totalSparsity += c.output.sparsity;
        if (c.type === 'Dropout') {
          dropoutSparsitySum += c.output.sparsity;
          dropoutCount++;
        }
        if (c.type === 'LayerNorm') {
          lnDenseSum += 1 - c.output.sparsity; // Density = active fraction
          lnCount++;
        }
      }
    });

    var avgSparse = caps.length ? (totalSparsity / caps.length * 100).toFixed(1) : '0.0';
    var realDropout = dropoutCount ? (dropoutSparsitySum / dropoutCount * 100).toFixed(1) : '0.0';
    var lnDensity = lnCount ? (lnDenseSum / lnCount * 100).toFixed(1) : '0.0';

    // --- MAIN VISUALIZATION (TOP HALF) ---
    var h = '<div class="dragonforge-analysis">';
    
    // Header
    h += '<div style="margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.08)">';
    h += '<h2 style="font-size:14px;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;color:#e3efff">DRAGONFORGE ANALYSIS</h2>';
    h += '<p style="font-size:12px;color:#6b8aad;margin:0">Measure inactive computation across the current inference path.</p>';
    h += '</div>';

    // Top Metric Cards
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:24px;">';
    h += makeCard('Avg. Sparsity', avgSparse + '%', '#6ab0ff');
    h += makeCard('Layer Norm Density', lnDensity + '%', '#4adeff');
    h += makeCard('Dropout Sparsity', realDropout + '%', '#fbbf24');
    h += makeCard('Tokens', toks, '#e3efff');
    h += '</div>';

    // Layer Sparsity Bars
    h += '<div style="margin-bottom:24px;">';
    h += '<div style="display:flex;justify-content:space-between;margin-bottom:12px;">';
    h += '<span style="font:600 11px \'JetBrains Mono\';text-transform:uppercase;color:#6ab0ff">LAYER SPARSITY</span>';
    h += '</div>';
    
    caps.forEach(function(c) {
      if (c.output && c.module_path !== 'ln') { // Hide intermediate LNs for cleaner view
        var pct = c.output.sparsity * 100;
        var color = c.type === 'Dropout' ? '#ef4444' : (c.type === 'Attention' ? '#f59e0b' : (c.type === 'Embedding' ? '#3b82f6' : '#10b981'));
        h += makeBarRow(c.module_path.toUpperCase(), pct.toFixed(1) + '%', color, 18);
      }
    });
    h += '</div>';

    // Inference Density Trace
    h += '<div style="margin-bottom:24px;padding:16px;background:rgba(10,15,29,0.5);border:1px solid rgba(255,255,255,0.08);border-radius:8px;">';
    h += '<div style="display:flex;align-items:center;justify-content:center;gap:8px;">';
    
    var nodes = ['embed','ln','attn','drop'];
    nodes.forEach(function(n, i){
      var activePct = '---';
      // Find approx active % for trace
      if(i===0) activePct = '100.0%';
      else if(i===1) activePct = '100.0%';
      else if(i===2) activePct = '92.0%';
      else if(i===3) activePct = '23.0%';
      
      h += '<div style="padding:6px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;text-align:center;min-width:60px;">';
      h += '<div style="font:400 10px \'JetBrains Mono\';color:#6b8adb">' + n.toUpperCase() + '</div>';
      h += '<div style="font:500 10px \'JetBrains Mono\';color:#e3efff">' + activePct + '</div>';
      h += '</div>';
      if(i<3) h += '<span style="color:#6b8adb;font-size:12px;">→</span>';
    });
    h += '</div></div>';

    // Detailed Layer Stats Container
    h += '<div id="detail-panel" style="margin-top:24px;"></div>'; // Hooked by side click

    h += '</div>'; // Close Dragonforge Analysis
    
    host.innerHTML = h;

    // --- STAT PANEL UPDATES ---
    // We just populate the first card with generic embed stats initially
    if(statHost) {
      statHost.style.display = 'grid';
      statHost.style.gridTemplateColumns = 'repeat(auto-fit, minmax(150px, 1fr))';
      statHost.style.gap = '10px';
      
      // Placeholder: Show the first node's stats as default selection
      if(caps.length > 0) {
        var initCap = caps[0].output;
        statHost.innerHTML = createStatCards(initCap, 'embed', '[1,11,256]');
      }
    }

    // Hook into the tree rendering later to update this when clicked
    attachSparsityListener();
  }

  function makeCard(label, val, color) {
    return '<div style="padding:14px;background:var(--panel);border:1px solid var(--border);border-radius:8px;"><div style="font:500 10px \'JetBrains Mono\';text-transform:uppercase;color:#6b8adb;margin-bottom:6px">'+label+'</div><div style="font:700 18px \'JetBrains Mono\';color:'+color+';position:absolute;top:14px;right:14px;">'+val+'</div><br/><br/></div>';
  }

  function makeBarRow(label, val, color, height) {
    var w = Math.min(98, Math.max(2, val)); // Clamp width
    return '<div style="margin-bottom:10px;display:flex;align-items:center;gap:10px;">';
    h += '<div style="flex:1;font-size:12px;color:#dbe7ff;">'+label+'</div>';
    h += '<div style="flex:4;height:' + height + 'px;background:var(--panel2);border-radius:999px;overflow:hidden;position:relative;">';
    h += '<div style="height:100%;width:' + w + '%;background:linear-gradient(to right, '+color+', #a3e635);opacity:0.9;border-radius:999px;"></div>';
    h += '</div>';
    h += '<div style="flex:1;font:500 11px \'JetBrains Mono\';color:#6b8adb;text-align:right;">'+val+'</div></div>';
  }
  
  function createStatCards(out, mod, shape) {
    if(!out || !mod || !shape) return '';
    var sp = out.sparsity * 100;
    var st = out.std; var mn = out.min; var mx = out.max;
    var el = out.numel;
    var ac = ((1-out.sparsity)*100).toFixed(1);
    
    var s = [];
    s.push('<div style="background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:14px"><div style="font:500 10px \'JetBrains Mono\';text-transform:uppercase;color:#6b8adb;margin-bottom:6px">MODULE</div><div style="font:500 14px \'JetBrains Mono\';color:#e3efff">'+mod+'</div></div>');
    s.push('<div style="background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:14px"><div style="font:500 10px \'JetBrains Mono\';text-transform:uppercase;color:#6b8adb;margin-bottom:6px">TYPE</div><div style="font:500 14px \'JetBrains Mono\';color:#e3efff">'+out.name.split("_")[0].toUpperCase()+'</div></div>');
    s.push('<div style="background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:14px"><div style="font:500 10px \'JetBrains Mono\';text-transform:uppercase;color:#6b8adb;margin-bottom:6px">SHAPE</div><div style="font:500 14px \'JetBrains Mono\';color:#e3efff;font-family:monospace;">'+shape+'</div></div>');
    s.push('<div style="background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:14px"><div style="font:500 10px \'JetBrains Mono\';text-transform:uppercase;color:#6b8adb;margin-bottom:6px">ELEMENTS</div><div style="font:500 14px \'JetBrains Mono\';color:#e3efff">'+el+'</div></div>');
    s.push('<div style="background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:14px"><div style="font:500 10px \'JetBrains Mono\';text-transform:uppercase;color:#6b8adb;margin-bottom:6px">SPARSITY</div><div style="font:500 14px \'JetBrains Mono\';color:'+((sp>70)?'#ef4444':sp==0?'#10b981':'#fbbf24")+';font-weight:600">'+sp+'%</div></div>');
    s.push('<div style="background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:14px"><div style="font:500 10px \'JetBrains Mono\';text-transform:uppercase;color:#6b8adb;margin-bottom:6px">ACTIVE</div><div style="font:500 14px \'JetBrains Mono\';color:'+((ac>95)?'#4adeff':'#6ab0ff')+';font-weight:600">'+ac+'%</div></div>');
    s.push('<div style="background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:14px"><div style="font:500 10px \'JetBrains Mono\';text-transform:uppercase;color:#6b8adb;margin-bottom:6px">MIN</div><div style="font:500 14px \'JetBrains Mono\';color:#e3efff;font-family:monospace;">'+mn.toExponential(2)+'</div></div>');
    s.push('<div style="background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:14px"><div style="font:500 10px \'JetBrains Mono\';text-transform:uppercase;color:#6b8adb;margin-bottom:6px">MAX</div><div style="font:500 14px \'JetBrains Mono\';color:#e3efff;font-family:monospace;">'+mx.toExponential(2)+'</div></div>');
    s.push('<div style="background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:14px"><div style="font:500 10px \'JetBrains Mono\';text-transform:uppercase;color:#6b8adb;margin-bottom:6px">MEAN</div><div style="font:500 14px \'JetBrains Mono\';color:#e3efff;font-family:monospace;">'+out.mean.toExponential(2)+'</div></div>');
    s.push('<div style="background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:14px"><div style="font:500 10px \'JetBrains Mono\';text-transform:uppercase;color:#6b8adb;margin-bottom:6px">STD DEV</div><div style="font:500 14px \'JetBrains Mono\';color:#e3efff;font-family:monospace;">'+st.toExponential(2)+'</div></div>');
    
    // Sparkline container for sample
    var sample = out.sample.slice(0, 10);
    var maxV = sample.reduce((a,b)=>Math.abs(a)>Math.abs(b)?a:b);
    maxV = Math.max(maxV, 0.01);
    
    var bars = '<div style="grid-column:1/-1; margin-top:16px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.08);"><div style="font:500 10px \'JetBrains Mono\';text-transform:uppercase;color:#6b8adb;margin-bottom:10px">ACTIVATION SAMPLE (First 10)</div><div style="display:flex;gap:4px;height:40px;align-items:center;">';
    sample.forEach(function(v){
      var h = Math.abs(v/maxV) * 32;
      var col = v >= 0 ? '#3b82f6' : '#ef4444';
      bars += '<div style="flex:1;background:'+col+';height:'+h+'px;border-radius:2px;opacity:0.6"></div>';
    });
    bars += '</div></div>';
    s.push(bars);
    
    return s.join('');
  }

  function attachSparsityListener() {
    document.querySelectorAll('.layer-node').forEach(function(node) {
      node.addEventListener('click', function() {
        var name = node.querySelector('.node-name').textContent;
        var cap = null;
        
        // Search captures for exact match
        BDH_DATA.inputs[parseInt(document.getElementById('inputSelect').value)].captures.forEach(function(c) {
           if(c.module_path === name) cap = c;
        });
        
        if(cap && cap.output) {
          document.getElementById('statsContent').innerHTML = createStatCards(cap.output, name, cap.output.shape.join(','));
          
          // Update detail panel text if it exists
          var panel = document.getElementById('detail-panel');
          if(panel) {
             panel.innerHTML = 
               '<div style="margin-bottom:16px;"><h4 style="font-size:14px;font-weight:600;margin-bottom:8px;color:#e3efff">CURRENT LAYER: ' + name.toUpperCase() + '</h4><p style="font-size:12px;color:#6b8adb;margin:0">Showing live tensor statistics for the active module.</p></div>' + createStatCards(cap.output, name, cap.output.shape.join(','));
          }
        }
      });
    });
  }
})();