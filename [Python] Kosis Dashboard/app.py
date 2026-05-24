import dash
import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output
import plotly.graph_objects as go

import pandas as pd

external_stylesheets = ['https://codepen.io/chriddyp/pen/bWLwgP.css']

app = dash.Dash(__name__, external_stylesheets=external_stylesheets)
server = app.server

# csv 파일 읽어서 DataFrame 만들기
# df = pd.read_csv('https://raw.githubusercontent.com/barkle2/Programming/master/%5BPython%5D%20Tutorial/kosis_data.csv')
df = pd.read_csv('kosis_data.csv')

# YEAR, MONTH 컬럼을 추가
df['YEAR'] = df.PRD_DE.astype(str).str[:4]
df['MONTH'] = df.PRD_DE.astype(str).str[4:].astype(int)

# DropDown 입력값 리스트 만들기
itm_list = list(zip(df.ITM_NM.unique(), df.ITM_ID.unique())) # 항목
sex_list = list(zip(df.C1_NM.unique(), df.C1.unique()))  # 성별
age_list = list(zip(df.C2_NM.unique(), df.C2.unique()))  # 연령
year_list = list(zip(df.YEAR.unique(), df.YEAR.unique()))  # 연도
year_list.reverse()

# 초기값 설정
itm_value = 'T10'
sex_value = 0
age_value = 0
year_value = ['2021','2020']

# graph figure 생성
fig = go.Figure()

for year in year_value:
    # Dropdown Value에 맞는 데이터만 그래프용으로 추출
    df_graph = df[(df.ITM_ID==itm_value) & (df.C1==sex_value) & (df.C2==age_value) & (df.YEAR==year)]
    fig.add_trace(go.Scatter(x=df_graph.MONTH, y=df_graph.DT, name=year, mode='lines+markers'))
    fig.update_xaxes(range=[0.5,12.5],
        ticktext=['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
        tickvals=[1,2,3,4,5,6,7,8,9,10,11,12])

# layout 생성
app.layout = html.Div([
    html.H3('경제활동인구조사 (월별 통계)', style={"textAlign": "center"}),
    html.Div([
        dcc.Dropdown(
            id='itm_dropdown',
            options=[
                {'label':i, 'value':j} for i,j in itm_list
            ],
            value=itm_value,
            searchable=False,
            style=dict(
                width='100%',                
            )        
        ),
        dcc.Dropdown(
            id='sex_dropdown',
            options=[
                {'label':i, 'value':j} for i,j in sex_list
            ],
            value=sex_value,
            searchable=False,
            style=dict(
                width='100%',                
            )        
        )        
    ], style=dict(display='flex')
    ),
    html.Div([
        dcc.Dropdown(
            id='age_dropdown',
            options=[
                {'label':i, 'value':j} for i,j in age_list
            ],
            value=age_value,
            searchable=False,
            style=dict(
                width='100%',                
            )        
        ),
        dcc.Dropdown(
            id='year_dropdown',
            options=[
                {'label':i, 'value':j} for i,j in year_list
            ],
            value=year_value,
            searchable=False,
            multi=True,
            style=dict(
                width='100%',                
            )        
        ),
    ], style=dict(display='flex')
    ),
    dcc.Graph(id='graph', figure=fig)    
])

@app.callback(
    Output('graph', 'figure'),
    Input('itm_dropdown', 'value'),
    Input('sex_dropdown', 'value'),
    Input('age_dropdown', 'value'),
    [Input('year_dropdown', 'value')]
)
def update_graph(itm_val, sex_val, age_val, year_val):
    print(itm_val, sex_val, age_val, year_val)
    # graph figure 생성
    fig = go.Figure()
    for year in year_val:
        # Dropdown Value에 맞는 데이터만 그래프용으로 추출
        df_graph = df[(df.ITM_ID==itm_val) & (df.C1==sex_val) & (df.C2==age_val) & (df.YEAR==year)]
        fig.add_trace(go.Scatter(x=df_graph.MONTH, y=df_graph.DT, name=year, mode='lines+markers'))
        fig.update_xaxes(range=[0.5,12.5],
            ticktext=['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
            tickvals=[1,2,3,4,5,6,7,8,9,10,11,12])
    return fig

if __name__ == '__main__':
    app.run_server(debug=False)
