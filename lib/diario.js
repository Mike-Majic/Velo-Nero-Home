    const out = await apiGet("/api/diary/list?limit=100");
    if (!out?.ok) {
      listEl.textContent = "Errore caricamento";
      return;
    }

    const items = out.items || [];
    chipCount.textContent = String(items.length);

    if (!items.length) {
      listEl.innerHTML = "<div class='muted'>Nessuna voce</div>";
      return;
    }

    listEl.innerHTML = items.map(e => {
      const title = e.title ? escapeHtml(e.title) : "Diario";
      const day = escapeHtml(e.day || "—");
      const when = fmtWhen(e.at);
      const by = escapeHtml(e.by || "—");
      const role = escapeHtml(e.byRole || "—");
      const text = escapeHtml(e.text || "");

      return `
        <div class="entry" id="${escapeHtml(e.id)}">
          <div class="entryHead">
            <div>
              <div class="entryTitle">${title}</div>
              <div class="entryMeta">${day} • ${when}</div>
            </div>
            <div class="entryMeta">${by} • ${role}</div>
          </div>
          <div class="entryText">${text}</div>
        </div>
      `;
    }).join("");

    // Se arrivi con hash (#id), scrolla bene
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  (async function init(){
    await guard();
    await loadDiary();
  })();
</script>

</body>
</html>
