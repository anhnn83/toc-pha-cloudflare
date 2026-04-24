// src/utils/githubService.ts -- Version 1.6 (Bổ sung tính năng lấy Audit Log / Lịch sử Commit)

import { Octokit } from "octokit";

// CÔNG TẮC CHUYỂN ĐỔI: Chỉnh thành true để test Local, false để dùng Git thật
const IS_LOCAL_TEST = false; 

export class GitHubService {
  private octokit: Octokit | null = null;
  private owner: string;
  private repo: string;

  constructor(token: string) {
    this.owner = import.meta.env.VITE_REPO_OWNER;
    this.repo = import.meta.env.VITE_REPO_NAME;
    if (!IS_LOCAL_TEST) {
      this.octokit = new Octokit({ auth: token });
    }
  }

  async getFile(path: string, isJson: boolean = true) {
    if (IS_LOCAL_TEST) {
      // Đọc từ localStorage nếu đang test
      const localData = localStorage.getItem(`mock_git_${path}`);
      if (localData) {
        return { content: isJson ? JSON.parse(localData) : localData, sha: "mock-sha" };
      }
      // Nếu local chưa có gì, trả về null để Admin.tsx tự fetch file tĩnh ban đầu
      return null;
    }

    // Logic gọi GitHub thật
    try {
      const { data }: any = await this.octokit!.rest.repos.getContent({
        owner: this.owner, repo: this.repo, path,
        headers: { 'if-none-match': '' },
        t: new Date().getTime() 
      });
      const rawBase64 = data.content.replace(/\s/g, '');
      if (!isJson) return { content: rawBase64, sha: data.sha };
      const content = decodeURIComponent(escape(atob(rawBase64)));
      return { content: JSON.parse(content), sha: data.sha };
    } catch (error: any) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async updateFile(path: string, content: any, sha?: string, message: string = "Update") {
    if (IS_LOCAL_TEST) {
      // Ghi vào localStorage thay vì Git
      const dataToSave = typeof content === 'string' ? content : JSON.stringify(content);
      localStorage.setItem(`mock_git_${path}`, dataToSave);
      
      // Giả lập lưu Log lịch sử khi test Local
      const mockCommitsStr = localStorage.getItem(`mock_commits_${path}`);
      const mockCommits = mockCommitsStr ? JSON.parse(mockCommitsStr) : [];
      mockCommits.unshift({
        commit: {
          message: message,
          author: { date: new Date().toISOString() }
        },
        sha: `mock-sha-${Date.now()}`
      });
      // Chỉ lưu 50 log mới nhất cho Local Test
      localStorage.setItem(`mock_commits_${path}`, JSON.stringify(mockCommits.slice(0, 50)));
      
      console.log(`[LOCAL TEST] Đã lưu tệp ${path} vào LocalStorage`);
      return true;
    }

    // Logic cập nhật GitHub thật
    try {
      const updatedContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      const encodedContent = typeof content === 'string' 
        ? content 
        : btoa(unescape(encodeURIComponent(updatedContent)));

      await this.octokit!.rest.repos.createOrUpdateFileContents({
        owner: this.owner, repo: this.repo, path, message,
        content: encodedContent, sha: sha || undefined,
      });
      return true;
    } catch (error) { throw error; }
  }

  // TÍNH NĂNG MỚI: Lấy danh sách lịch sử commit (Audit Log)
  async getCommits(path: string, perPage: number = 30) {
    if (IS_LOCAL_TEST) {
      // Đọc log giả lập từ localStorage
      const mockCommitsStr = localStorage.getItem(`mock_commits_${path}`);
      return mockCommitsStr ? JSON.parse(mockCommitsStr) : [];
    }

    // Lấy lịch sử commit thật từ GitHub
    try {
      const { data } = await this.octokit!.rest.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        path: path,
        per_page: perPage
      });
      return data;
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử commit:", error);
      throw error;
    }
  }
}