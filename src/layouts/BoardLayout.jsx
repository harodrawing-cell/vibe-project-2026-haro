export default function BoardLayout({
  children,
  qna = false,
  account = false,
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`notice-page ${qna ? 'qna-page' : ''} ${account ? 'account-page' : ''}`}
    >
      <div className="notice-page__heading">
        <img
          className="notice-heading__art"
          src="./images/img-dt/img_5_haro-cat.png"
          width="64"
          height="64"
          alt=""
          aria-hidden="true"
        />
        <h1>
          {typeof account === 'string' ? account : qna ? 'Q&A' : 'NOTICE'}
        </h1>
        <span className="notice-page__rule" aria-hidden="true" />
        <p>
          {account
            ? '하로와 함께하는 하루, 반가워요.'
            : qna
              ? '하로에게 궁금한 점을 남겨주세요.'
              : '하로의 새로운 소식을 전해드려요.'}
        </p>
      </div>
      {!account && (
        <aside className="notice-test">
          <p>
            {qna
              ? '비공개 질문은 작성자와 관리자만 열람할 수 있습니다. 질문 수정·삭제는 작성자 본인만 가능합니다.'
              : '공지사항은 누구나 열람할 수 있으며, 글쓰기는 로그인 후 가능합니다. 게시글 수정·삭제는 작성자 본인과 관리자만 할 수 있습니다.'}
          </p>
        </aside>
      )}
      <div className="notice-content">{children}</div>
    </main>
  );
}
