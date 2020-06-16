// All copyright and related or neighbouring rights to this work have been waived via CC0.
// To view a copy of this dedication, visit http://creativecommons.org/publicdomain/zero/1.0/.

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("form").addEventListener("submit", async e => {
    e.preventDefault();
    const old_branch = e.target.old_branch.value;
    const new_branch = e.target.new_branch.value;
    const headers = {authorization: `token ${e.target.token.value}`};

    const repos = await fetch('https://api.github.com/user/repos?type=owner', {headers})
      .then(resp => resp.json());
    const progress = repos.map(repo => ({repo: repo.full_name}));

    await Promise.all(progress.map(p =>
      fetch(`https://api.github.com/repos/${p.repo}/git/ref/heads/${old_branch}`, {headers})
        .then(resp => (resp.ok ? resp.json() : null)).then(data => {p.sha = data})
    ));

    await Promise.all(progress.filter(p => p.sha).map(p =>
      fetch(`https://api.github.com/repos/${p.repo}/git/refs`, {method: 'POST', headers,
          body: JSON.stringify({ref: `refs/heads/${new_branch}`, sha: p.sha.object.sha})})
        .then(resp => (resp.ok ? resp.json() : null)).then(data => {p.post = data})
    ));

    const patch = {method: 'PATCH', headers, body: JSON.stringify({default_branch: new_branch})};
    await Promise.all(progress.map(p =>
      fetch(`https://api.github.com/repos/${p.repo}`, patch)
        .then(resp => (resp.ok ? resp.json() : null)).then(data => {p.patch = data})
    ));

    const del = {method: 'DELETE', headers};
    await Promise.all(progress.filter(p => p.patch).map(p =>
      fetch(`https://api.github.com/repos/${p.repo}/git/refs/heads/${old_branch}`, del)
        .then(resp => {p.del = (resp.ok ? 'success' : null)})
    ));

    console.log('If any field is null or undefined, then the corresponding operation failed.');
    console.log(progress);
  });
});
