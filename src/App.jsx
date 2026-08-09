import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [profiles, setProfiles] = useState([])
  const [workspaces, setWorkspaces] = useState([])
  const [workspaceMembers, setWorkspaceMembers] = useState([])
  const [channels, setChannels] = useState([])
  const [messages, setMessages] = useState([])
  
  const [activeWorkspace, setActiveWorkspace] = useState(null)
  const [activeChannel, setActiveChannel] = useState(null)
  
  const [loading, setLoading] = useState(true) // 처음엔 무조건 로딩 중이므로 true로 시작
  const [messagesLoading, setMessagesLoading] = useState(false)

  // 1. 초기 데이터 로딩
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true)

      const [profilesResult, workspacesResult, membersResult, channelsResult] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url, status, created_at'),
        supabase.from('workspaces').select('id, name, icon_name, owner_id, invite_code, created_at'),
        supabase.from('workspace_members').select('id, workspace_id, user_id, role, joined_at'),
        supabase.from('channels').select('id, workspace_id, name, type, created_at'),
      ])

      if (profilesResult.error) console.error('profiles 에러:', profilesResult.error.message)
      else setProfiles(profilesResult.data || [])

      if (workspacesResult.error) console.error('workspaces 에러:', workspacesResult.error.message)
      else setWorkspaces(workspacesResult.data || [])

      if (membersResult.error) console.error('members 에러:', membersResult.error.message)
      else setWorkspaceMembers(membersResult.data || [])

      if (channelsResult.error) console.error('channels 에러:', channelsResult.error.message)
      else setChannels(channelsResult.data || [])

      setLoading(false)
    }

    fetchInitialData()
  }, [])

  // 2. 초기 워크스페이스 세팅
  useEffect(() => {
    if (!activeWorkspace && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0].id)
    }
  }, [workspaces, activeWorkspace])

  // 현재 워크스페이스에 속한 채널 목록
  const workspaceChannels = useMemo(
    () => channels.filter((channel) => channel.workspace_id === activeWorkspace),
    [channels, activeWorkspace]
  )

  // 3. 워크스페이스 변경 시 채널 자동 선택
  useEffect(() => {
    if (activeWorkspace && workspaceChannels.length > 0) {
      const isChannelInWorkspace = workspaceChannels.some(c => c.id === activeChannel)
      if (!isChannelInWorkspace) {
        setActiveChannel(workspaceChannels[0].id)
      }
    } else if (workspaceChannels.length === 0) {
      // 해당 워크스페이스에 채널이 아예 없으면 선택 해제
      setActiveChannel(null)
    }
  }, [activeWorkspace, workspaceChannels, activeChannel])

  // 4. 메시지 로딩
  useEffect(() => {
    if (!activeChannel) {
      setMessages([])
      return
    }

    const fetchMessages = async () => {
      setMessagesLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select('id, channel_id, user_id, author, type, text, created_at')
        .eq('channel_id', activeChannel)
        .order('created_at', { ascending: true })

      if (error) console.error('messages 에러:', error.message)
      else setMessages(data || [])
      
      setMessagesLoading(false)
    }

    fetchMessages()
  }, [activeChannel])

  const activeMembers = useMemo(() =>
      workspaceMembers
        .filter((member) => member.workspace_id === activeWorkspace)
        .map((member) => {
          const profile = profiles.find((p) => p.id === member.user_id)
          return {
            id: member.id,
            username: profile?.username || 'Anonymous',
            role: member.role,
            status: profile?.status || 'online',
          }
        }),
    [workspaceMembers, profiles, activeWorkspace],
  )

  // 상단 헤더 채널 이름 텍스트 처리
  const activeChannelName = useMemo(() => {
    if (loading) return '로딩 중...'
    if (!activeChannel) return '채널 없음'
    const channel = channels.find(c => c.id === activeChannel)
    return channel ? channel.name : '채널 없음'
  }, [channels, activeChannel, loading])

  const handleSendMessage = async (e) => {
    e.preventDefault(); // 폼 제출 시 페이지 새로고침 방지

    // 1. input 태그의 입력값 가져오기
    const inputElement = e.target.elements[0];
    const rawText = inputElement.value.trim();

    // 2. 빈 값이나 선택된 채널이 없으면 전송 중단
    if (!rawText || !activeChannel) return;

    // 3. 코드 블록(```) 자동 감지 및 타입 설정
    let messageType = 'normal';
    let finalText = rawText;

    // 텍스트에 백틱 3개(```)가 포함되어 있다면 'code' 타입으로 분류
    if (rawText.includes('```')) {
      messageType = 'code';
      // 양 끝에 있는 ``` 기호와 언어 이름(예: ```js)을 깔끔하게 제거
      finalText = rawText.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
    }

    // 4. Supabase DB에 데이터 삽입 (Insert)
    const { error } = await supabase.from('messages').insert({
      channel_id: activeChannel,
      author: '???', // 실제 유저 닉네임으로 변경 필요
      type: messageType,
      text: finalText,
    });

    if (error) {
      console.error('메시지 전송 에러:', error.message);
      alert('메시지 전송에 실패했습니다.');
    } else {
      // 5. 전송 성공 시 입력창 초기화
      inputElement.value = '';
    }
  };


  return (
    <div className="app-shell">
      {/* 워크스페이스 패널 */}
      <aside className="workspace-pane">
        <div className="pane-title">Workspaces</div>
        <div className="workspace-list">
          {loading ? (
            <p className="system-text">로딩 중...</p>
          ) : workspaces.length > 0 ? (
            workspaces.map((workspace) => (
              <button
                key={workspace.id}
                className={`workspace-icon ${activeWorkspace === workspace.id ? 'active' : ''}`}
                onClick={() => setActiveWorkspace(workspace.id)}
                title={workspace.name}
              >
                {workspace.icon_name || workspace.name.slice(0, 2).toUpperCase()}
              </button>
            ))
          ) : (
            <p className="system-text">데이터가 없습니다.</p>
          )}
        </div>
      </aside>

      {/* 채널 패널 */}
      <aside className="channel-pane">
        <div className="pane-title">Channels</div>
        <div className="channel-list">
          {loading ? (
            <p className="system-text">로딩 중...</p>
          ) : workspaceChannels.length > 0 ? (
            workspaceChannels.map((channel) => (
              <button
                key={channel.id}
                className={`channel-pill ${activeChannel === channel.id ? 'active' : ''}`}
                onClick={() => setActiveChannel(channel.id)}
              >
                <span>{channel.name}</span>
                <small>{channel.type}</small>
              </button>
            ))
          ) : (
            <p className="system-text">데이터가 없습니다.</p>
          )}
        </div>
        <div className="mini-card">
          <h4>Developer Quick Tools</h4>
          <p>코드 실행, GitHub 카드, 페어 프로그래밍 룸을 한 번에 열 수 있습니다.</p>
        </div>
      </aside>

      {/* 메인 채팅창 */}
      <main className="chat-pane">
        <header className="chat-header">
          <div>
            <p className="eyebrow">DevSpace · {activeChannelName}</p>
            <h1>
              {loading 
                ? '데이터를 불러오는 중입니다...' 
                : activeWorkspace 
                  ? '개발자 전용 협업 채팅' 
                  : '데이터가 없습니다.'}
            </h1>
          </div>
          <button className="primary-btn">Open Pair Room</button>
        </header>

        <section className="chat-stream">
          {messagesLoading ? (
            <p className="system-text">메시지를 불러오는 중...</p>
          ) : !activeChannel ? (
            <p className="system-text">선택된 채널이 없습니다.</p>
          ) : messages.length > 0 ? (
            messages.map((message) => (
              <article key={message.id} className={`message-card ${message.type}`}>
                <div className="message-meta">
                  <strong>{message.author}</strong>
                  <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {message.type === 'code' ? <pre>{message.text}</pre> : <p>{message.text}</p>}
              </article>
            ))
          ) : (
            <p className="system-text">이 채널에 아직 메시지가 없습니다.</p>
          )}
        </section>

        <footer className="composer">
          <form onSubmit={handleSendMessage} style={{ display: 'flex', width: '100%', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="메시지와 코드 스니펫을 공유해보세요 (```로 코드를 감싸보세요)" 
              disabled={!activeChannel}
              style={{ flex: 1 }}
            />
            <button 
              type="submit" 
              className="primary-btn" 
              disabled={!activeChannel}
            >
              Send
            </button>
          </form>
        </footer>
      </main>

      {/* 우측 멤버 상태창 */}
      <aside className="status-pane">
        <div className="pane-title">Active Status</div>
        <div className="member-list">
          {loading ? (
            <p className="system-text">로딩 중...</p>
          ) : activeMembers.length > 0 ? (
            activeMembers.map((member) => (
              <div key={member.id} className="member-card">
                <div>
                  <strong>{member.username}</strong>
                  <p>{member.role}</p>
                </div>
                <span className="status-pill">{member.status}</span>
              </div>
            ))
          ) : (
            <p className="system-text">데이터가 없습니다.</p>
          )}
        </div>

        <div className="mini-card alt">
          <h4>Live Build Status</h4>
          <p>CI/CD · PR Approve · Merge 버튼이 채팅 카드 내에서 바로 열립니다.</p>
        </div>
      </aside>
    </div>
  )
}

export default App