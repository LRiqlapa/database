import { renderHtml } from "./renderHtml";

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const path = url.pathname;

		// API Endpoints
		if (path.startsWith('/api/')) {
			return handleApiRequest(request, env, path);
		}

		// Halaman HTML default
		const stmt = env.DB.prepare("SELECT * FROM comments LIMIT 100000");
		const { results } = await stmt.all();

		return new Response(renderHtml(JSON.stringify(results, null, 2)), {
			headers: {
				"content-type": "text/html",
			},
		});
	},
} satisfies ExportedHandler<Env>;

// Fungsi untuk menangani request API
async function handleApiRequest(request, env, path) {
	const method = request.method;

	// GET /api/comments
	if (path === '/api/comments' && method === 'GET') {
		try {
			const stmt = env.DB.prepare("SELECT * FROM comments");
			const { results } = await stmt.all();
			
			return new Response(JSON.stringify({
				success: true,
				data: results
			}), {
				headers: {
					"content-type": "application/json",
					"Access-Control-Allow-Origin": "*"
				},
			});
		} catch (error) {
			return new Response(JSON.stringify({
				success: false,
				error: error.message
			}), {
				status: 500,
				headers: { "content-type": "application/json" }
			});
		}
	}

	// POST /api/comments
	if (path === '/api/comments' && method === 'POST') {
		try {
			const body = await request.json();
			const { author, content } = body;

			if (!author || !content) {
				return new Response(JSON.stringify({
					success: false,
					error: "Author and content are required"
				}), {
					status: 400,
					headers: { "content-type": "application/json" }
				});
			}

			const stmt = env.DB.prepare(
				"INSERT INTO comments (author, content) VALUES (?, ?)"
			).bind(author, content);

			const result = await stmt.run();

			return new Response(JSON.stringify({
				success: true,
				message: "Comment added successfully",
				id: result.meta.last_row_id
			}), {
				headers: {
					"content-type": "application/json",
					"Access-Control-Allow-Origin": "*"
				},
			});
		} catch (error) {
			return new Response(JSON.stringify({
				success: false,
				error: error.message
			}), {
				status: 500,
				headers: { "content-type": "application/json" }
			});
		}
	}

	// DELETE /api/comments/:id
	if (path.startsWith('/api/comments/') && method === 'DELETE') {
		try {
			const id = path.split('/')[3];
			
			const stmt = env.DB.prepare(
				"DELETE FROM comments WHERE id = ?"
			).bind(id);

			const result = await stmt.run();

			if (result.meta.rows_affected === 0) {
				return new Response(JSON.stringify({
					success: false,
					error: "Comment not found"
				}), {
					status: 404,
					headers: { "content-type": "application/json" }
				});
			}

			return new Response(JSON.stringify({
				success: true,
				message: "Comment deleted successfully"
			}), {
				headers: {
					"content-type": "application/json",
					"Access-Control-Allow-Origin": "*"
				},
			});
		} catch (error) {
			return new Response(JSON.stringify({
				success: false,
				error: error.message
			}), {
				status: 500,
				headers: { "content-type": "application/json" }
			});
		}
	}

	// Endpoint tidak ditemukan
	return new Response(JSON.stringify({
		success: false,
		error: "Endpoint not found"
	}), {
		status: 404,
		headers: { "content-type": "application/json" }
	});
}
