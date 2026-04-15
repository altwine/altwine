export async function getReposList() {
	const reposResponse = await fetch("https://api.github.com/users/altwine/repos");
	const reposList = reposResponse.json();

	return reposList;
}
