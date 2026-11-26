const date = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris'
});

export function showTeamComments(section, { groups, code, team, player, signal }) {
  section.innerHTML = `<h3>Commentaires</h3>
    <p role="status">Chargement des commentaires…</p>
    <ul class="team-comments"></ul>
    <form hidden>
      <label for="team-comment-text">Ton commentaire</label>
      <textarea id="team-comment-text" maxlength="500" rows="3" required></textarea>
      <button type="submit" class="ghost">Publier</button>
    </form>`;
  const status = section.querySelector('[role="status"]');
  const list = section.querySelector('ul');
  const form = section.querySelector('form');
  const input = form.querySelector('textarea');
  const submit = form.querySelector('button');

  const unsubscribe = groups.watchTeamComments(code, team, comments => {
    if (signal.aborted) return;
    status.textContent = comments.length ? '' : 'Aucun commentaire pour le moment.';
    form.hidden = false;
    list.replaceChildren(...comments.map(comment => {
      const row = document.createElement('li');
      const author = document.createElement('strong');
      author.textContent = comment.pseudo;
      const timestamp = document.createElement('small');
      timestamp.textContent = comment.createdAt ? ' · ' + date.format(comment.createdAt.toDate()) : '';
      const text = document.createElement('p');
      text.textContent = comment.text;
      row.append(author, timestamp, text);
      if (comment.author === player) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'ghost';
        remove.textContent = 'Supprimer';
        remove.setAttribute('aria-label', 'Supprimer mon commentaire');
        remove.onclick = async () => {
          remove.disabled = true;
          try { await groups.deleteTeamComment(code, team, comment.id); }
          catch {
            status.textContent = 'Impossible de supprimer ce commentaire.';
            remove.disabled = false;
          }
        };
        row.append(remove);
      }
      return row;
    }));
  }, () => {
    if (signal.aborted) return;
    list.replaceChildren();
    form.hidden = true;
    status.textContent = 'Commentaires indisponibles pour ce gouvernement.';
  });
  signal.addEventListener('abort', unsubscribe, { once: true });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || submit.disabled) return;
    submit.disabled = input.disabled = true;
    try {
      await groups.addTeamComment(code, team, text);
      input.value = '';
    } catch {
      status.textContent = 'Impossible de publier ce commentaire. Réessaie.';
    } finally {
      submit.disabled = input.disabled = false;
    }
  }, { signal });
}
