import argparse
import json
import pathlib

import UnityPy
from UnityPy.helpers import TypeTreeHelper
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
from UnityPy.helpers.TypeTreeNode import TypeTreeNode


class Generator(TypeTreeGenerator):
    def get_nodes_up(self,assembly,fullname):
        key=(assembly,fullname)
        if key not in self.cache:
            self.cache[key]=TypeTreeNode.from_list([TypeTreeNode(n.m_Level,n.m_Type,n.m_Name,0,0,m_MetaFlag=(n.m_MetaFlag | 16384 if n.m_Name=="m_Enabled" else n.m_MetaFlag)) for n in self.get_nodes(assembly.removesuffix('.dll'),fullname)])
        return self.cache[key]


parser=argparse.ArgumentParser(description="Read Unity gameplay configuration without running the game.")
parser.add_argument('game_root',type=pathlib.Path)
parser.add_argument('output_dir',type=pathlib.Path)
args=parser.parse_args()
p=args.game_root
args.output_dir.mkdir(parents=True,exist_ok=True)
probe=UnityPy.load(str(p/'Everything is Crab_Data/resources.assets'))
version=next(iter(probe.files.values())).unity_version
del probe
g=Generator(version)
g.load_local_game(str(p))
out=[]
errs=[]
TypeTreeHelper.read_typetree_boost=None


def resolve_ref(obj,af):
    t=obj['type']
    cls=t['class']
    ns=t['ns']
    asm=t['asm']
    if not cls or cls=='Terminus':
        return None
    n=g.get_nodes_up(asm,(ns+'.' if ns else '')+cls)
    original=n
    n=TypeTreeNode(0,'ref','Base',0,0)
    n.m_Children=[c for c in original.m_Children if c.m_Name not in ['m_GameObject','m_Enabled','m_Script','m_Name']]
    return n
TypeTreeHelper.get_ref_type_node=resolve_ref
for f in list((p/'Everything is Crab_Data').glob('*.assets'))+list((p/'Everything is Crab_Data').glob('level[0-9]')):
    e=UnityPy.load(str(f))
    e.typetree_generator=g
    for o in e.objects:
        if o.type.name!='MonoBehaviour':continue
        try:
            h=o.parse_monobehaviour_head()
            s=h.m_Script.deref_parse_as_object()
            cls=s.m_Namespace+'.'+s.m_ClassName
            if s.m_AssemblyName!='Assembly-CSharp':continue
            if not h.m_Name and not any(z in cls for z in ['World.Items.BasicFood','World.Items.HpFood','World.Burrows.Burrow','MapGenerator','EnemyDirector','PlayerCharacter','WorldConsts','EvolutionManager','Clock','GameFlow','Temperature','Weather','DayNight','DayAndNight','TimeManagement.TimeManager']):continue
            d=o.read_typetree()
            assert d['m_Script']=={'m_FileID':h.m_Script.m_FileID,'m_PathID':h.m_Script.m_PathID}, 'Generated header differs from Unity header'
            out.append({'file':f.name,'pathId':o.path_id,'class':cls,'name':h.m_Name,'data':d})
        except Exception as ex:
            errs.append({'file':f.name,'pathId':o.path_id,'error':str(ex)})
    print(f.name,'decoded',len(out),'errors',len(errs),flush=True)
(args.output_dir/'objects.json').write_text(json.dumps(out,indent=2,ensure_ascii=False))
(args.output_dir/'decode-errors.json').write_text(json.dumps(errs,indent=2))
