import { NavLink } from 'react-router-dom'

function Sidebar() {
  return (
    <aside className="sidebar">

      <div className="sidebar-logo">
        <div className="logo-icon">C</div>

        <div>
          <h2>Call'Insight</h2>
          <span>AI Customer Intelligence</span>
        </div>
      </div>

      <nav className="sidebar-nav">

        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive ? 'nav-item active' : 'nav-item'
          }
        >
          <span>Analyze a Call</span>
        </NavLink>

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? 'nav-item active' : 'nav-item'
          }
        >
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/ask"
          className={({ isActive }) =>
            isActive ? 'nav-item active' : 'nav-item'
          }
        >
          <span>Ask Call'Insight</span>
        </NavLink>

      </nav>

      <div className="sidebar-footer">
        <div className="status-dot"></div>
        <span>System Online</span>
      </div>

    </aside>
  )
}

export default Sidebar