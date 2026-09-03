(() => {
  const root = document.querySelector('[data-realisation-root]');
  if (!root) return;

  const id = new URLSearchParams(window.location.search).get('id');
  const data = window.REALISATIONS?.[id];

  if (!data) {
    root.innerHTML = `<section class="not-found"><div class="container"><p class="eyebrow">Réalisation introuvable</p><h1>Cette fiche n'existe pas encore.</h1><p>Le projet demandé n'est pas disponible ou son identifiant a changé.</p><a class="button button-primary" href="index.html#realisations">Retour aux réalisations</a></div></section>`;
    return;
  }

  document.title = `${data.title} — Sahad Safeer`;
  const pills = [data.category, data.date, ...(data.technologies || [])].map(item => `<span>${item}</span>`).join('');
  const work = (data.work || []).map(item => `<li>${item}</li>`).join('');
  const e5 = data.e5?.length
    ? `<ul class="detail-list">${data.e5.map(item => `<li>${item}</li>`).join('')}</ul>`
    : `<p>Aucune compétence E5 n'est attribuée à cette réalisation pour le moment.</p>`;
  const links = data.links?.length
    ? `<div class="detail-links">${data.links.map(link => `<a href="${link.href}">${link.label} ↗</a>`).join('')}</div>`
    : `<p class="project-e5-state">Aucun lien public disponible pour le moment.</p>`;

  root.innerHTML = `
    <section class="realisation-hero">
      <div class="container">
        <a class="realisation-back" href="index.html#realisations">← Retour aux réalisations</a>
        <p class="eyebrow">Fiche de réalisation</p>
        <h1>${data.title}</h1>
        <p class="realisation-lead">${data.lead}</p>
        <div class="realisation-meta">${pills}</div>
      </div>
    </section>
    <section class="realisation-body">
      <div class="container realisation-grid">
        <div class="realisation-sections">
          <article class="detail-panel glass-panel"><h2>Contexte</h2><p>${data.context}</p></article>
          <article class="detail-panel glass-panel"><h2>Objectif</h2><p>${data.objective}</p></article>
          <article class="detail-panel glass-panel"><h2>Travail réalisé</h2><ul class="detail-list">${work}</ul></article>
          <article class="detail-panel glass-panel"><h2>Résultat & suite</h2><p>${data.result}</p></article>
          <article class="detail-panel glass-panel"><h2>Difficultés / points d'attention</h2><p>${data.difficulties}</p></article>
        </div>
        <aside class="realisation-sidebar">
          <div class="detail-panel glass-panel"><p class="eyebrow">Bloc 1 — E5</p><h2>Compétences associées</h2>${e5}<p class="project-e5-state">${data.note || ''}</p></div>
          <div class="detail-panel glass-panel"><p class="eyebrow">Ressources</p><h2>Liens & documents</h2>${links}</div>
        </aside>
      </div>
    </section>`;
})();
