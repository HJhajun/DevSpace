import { useState, useEffect, useMemo } from 'react'
import "../css/workspace.css"

function WorkspaceList({ userId }) {
  const [myWorkspaces, setMyWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 유저 ID가 없으면 로딩 중단
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchMyWorkspaces = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          role,
          workspaces (
            id,
            name,
            icon_name,
            invite_code
          )
        `)
        .eq('user_id', userId)

      if (error) {
        console.error('내 워크스페이스 로딩 에러:', error.message)
      } else {
        const list = data.map((item) => ({
          ...item.workspaces,
          role: item.role // 해당 서버에서의 자신의 권한
        }))
        
        setMyWorkspaces(list)
      }

      setLoading(false)
    }

    fetchMyWorkspaces()
  }, [userId]) // userId가 바뀔 때마다 다시 실행

  if (loading) return <p className="system-text">로딩 중...</p>

  if (myWorkspaces.length === 0) {
    return (
      <div className="empty-state">
        <p>참여 중인 워크스페이스가 없습니다.</p>
        <small>오른쪽 메뉴에서 코드로 참여하거나 새로 만들어보세요!</small>
      </div>
    )
  }

  return (
    <div className="workspace-card-list scrollable">
      {myWorkspaces.map((ws) => (
        <div key={ws.id} className="workspace-card">
          <div className="ws-icon">
            {ws.icon_name || ws.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="ws-info">
            <h3>{ws.name}</h3>
            <span>{ws.role === 'owner' ? '👑 방장' : '멤버'}</span>
          </div>
          <button className="secondary-btn">입장</button>
        </div>
      ))}
    </div>
  )
}

function Workspace() {
    const [isInWorkspace, setInWorkspace] = useState(false); // 워크스페이스에 하나라도 참가되어 있는지 확인하기 위함

  return (
    <div className="workspace-lobby-container">
        <div className="lobby-content">
        <header className="lobby-header">
            <p className="eyebrow">DevSpace</p>
            <h1>Welcome back, Developer 👋</h1>
            <p>참여할 워크스페이스를 선택하거나 새로운 공간을 만들어보세요.</p>
        </header>

        <div className="lobby-grid">
            {/* 왼쪽: 검색창 + 워크스페이스 목록 영역 */}
            <section className="my-workspaces">
            <h2>내 워크스페이스</h2>

            {/* 검색창 */}
            <div className="search-box">
                <input 
                type="text" 
                placeholder="워크스페이스 이름 검색..." 
                /* onChange={(e) => setSearchQuery(e.target.value)} 연결용 */
                />
            </div>
            
            {/* 워크스페이스 목록 */}
            <div className="workspace-card-list scrollable">
                {/* DB에서 가져온 데이터가 들어올 자리입니다. (.map() 연결) */}
                
                {/* 데이터가 없거나 검색 결과가 없을 때 보여줄 기본 안내 문구 */}
                {isInWorkspace ? <WorkspceList /> : <div className="empty-state">
                    <p>참여 중인 워크스페이스가 없습니다.</p>
                    <small>오른쪽 메뉴에서 코드로 참여하거나 새로 만들어보세요!</small>
                </div>}
            </div>
            </section>

            {/* 오른쪽: 워크스페이스 참여 / 생성 액션 */}
            <aside className="lobby-actions">
            {/* 참여하기 폼 */}
            <div className="action-card">
                <h3>🤝 초대 코드로 참여하기</h3>
                <p>팀원에게 받은 초대 코드를 입력하세요.</p>
                <div className="input-group">
                <input type="text" placeholder="예: dev-xyz123" />
                <button className="primary-btn">참여</button>
                </div>
            </div>

            {/* 생성하기 폼 */}
            <div className="action-card alt">
                <h3>🚀 새 워크스페이스 만들기</h3>
                <p>새로운 프로젝트나 팀을 위한 공간을 개설합니다.</p>
                <div className="input-group vertical">
                <input type="text" placeholder="워크스페이스 이름" />
                <button className="primary-btn outline">개설하기</button>
                </div>
            </div>
            </aside>
        </div>
        </div>
    </div>
    )
}

export default Workspace