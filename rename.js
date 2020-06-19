// All copyright and related or neighbouring rights to this work have been waived via CC0.
// To view a copy of this dedication, visit http://creativecommons.org/publicdomain/zero/1.0/.

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("form").addEventListener("submit", async e => {
    e.preventDefault();
    const old_branch = e.target.old_branch.value;
    const new_branch = e.target.new_branch.value;
    const delete_branches = e.target.del.checked;
    const headers = {authorization: `token ${e.target.token.value}`};
    const progress = [];

    console.log('Fetching all repositories that you own...');
    let repos = [null];
    for (let i = 1; repos.length > 0; ++i) {
      repos = await fetch(`https://api.github.com/user/repos?type=owner&page=${i}`, {headers})
        .then(resp => resp.json());
      progress.push(...repos.map(repo => (
        {repo: repo.full_name, sha: null, post: null, patch: null, del: null})));
    }

    console.log(`Checking that the ${old_branch} branch exists on each repository...`);
    await Promise.all(progress.map(p =>
      fetch(`https://api.github.com/repos/${p.repo}/git/ref/heads/${old_branch}`, {headers})
        .then(resp => (resp.ok ? resp.json() : null)).then(data => {p.sha = data})
    ));

    console.log(`Creating the ${new_branch} branch on each repository...`);
    await Promise.all(progress.filter(p => p.sha).map(p =>
      fetch(`https://api.github.com/repos/${p.repo}/git/refs`, {method: 'POST', headers,
          body: JSON.stringify({ref: `refs/heads/${new_branch}`, sha: p.sha.object.sha})})
        .then(resp => (resp.ok ? resp.json() : null)).then(data => {p.post = data})
    ));

    console.log(`Changing the default branch to the ${new_branch} branch...`);
    const patch = {method: 'PATCH', headers, body: JSON.stringify({default_branch: new_branch})};
    await Promise.all(progress.map(p =>
      fetch(`https://api.github.com/repos/${p.repo}`, patch)
        .then(resp => (resp.ok ? resp.json() : null)).then(data => {p.patch = data})
    ));

    if (delete_branches) {
      console.log(`Deleting the ${old_branch} branch on each repository...`);
      const del = {method: 'DELETE', headers};
      await Promise.all(progress.filter(p => p.patch).map(p =>
        fetch(`https://api.github.com/repos/${p.repo}/git/refs/heads/${old_branch}`, del)
          .then(resp => {p.del = (resp.ok ? true : null)})
      ));
    }

    console.log(progress);
    console.log(`sha: the ref of the ${old_branch} branch, or null if it does not exist.`);
    console.log(`post: the ref of the ${new_branch} branch, or null if it already exists.`);
    console.log(`patch: the repo with ${new_branch} set as the new default branch`);
    console.log(`del: true if the ${old_branch} branch is successfully deleted, `
      + 'or null if it was not (e.g. it does not exist or you chose not to delete it).');
  });
});
